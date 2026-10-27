import { describe, expect, it } from "vitest";
import {
  POIDS,
  classer,
  ingredientPrincipal,
  scoreRecette,
  type ContexteScore,
  type RecetteANoter,
} from "@/lib/planificateur/score";

const toutLAnnee = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const contexte = (partiel: Partial<ContexteScore> = {}): ContexteScore => ({
  budgetParPortionFcfa: 400,
  mois: 6,
  aConsommerVite: new Set(),
  servieRecemment: new Set(),
  notes: new Map(),
  cuisinesPreferees: [],
  ...partiel,
});

const recette = (partiel: Partial<RecetteANoter> = {}): RecetteANoter => ({
  id: "r1",
  cuisine: "ivoirienne",
  coutParPortionFcfa: 400,
  ingredients: [
    { id: "riz", category: "féculent", seasonalMonths: toutLAnnee, grams: 500, optional: false },
  ],
  ...partiel,
});

describe("score des recettes", () => {
  it("préfère une portion moins chère que le budget", () => {
    expect(scoreRecette(recette({ coutParPortionFcfa: 200 }), contexte()).details.budget).toBe(
      0.5,
    );
    expect(scoreRecette(recette({ coutParPortionFcfa: 400 }), contexte()).details.budget).toBe(0);
    expect(scoreRecette(recette({ coutParPortionFcfa: 2000 }), contexte()).details.budget).toBe(
      -1,
    );
  });

  it("compte la saison des seuls ingrédients saisonniers", () => {
    const mangue = {
      id: "mangue",
      category: "fruit",
      seasonalMonths: [3, 4, 5],
      grams: 200,
      optional: false,
    };
    const r = recette({ ingredients: [...recette().ingredients, mangue] });
    expect(scoreRecette(r, contexte({ mois: 4 })).details.saison).toBe(1);
    expect(scoreRecette(r, contexte({ mois: 9 })).details.saison).toBe(-1);
    expect(scoreRecette(recette(), contexte()).details.saison).toBe(0);
  });

  it("met en avant les produits à consommer vite", () => {
    const c = contexte({ aConsommerVite: new Set(["riz"]) });
    expect(scoreRecette(recette(), c).details.stock).toBe(1);
  });

  it("pénalise une recette servie récemment", () => {
    const c = contexte({ servieRecemment: new Set(["r1"]) });
    expect(scoreRecette(recette(), c).details.variete).toBe(-1);
  });

  it("tient compte des notes de départ et des cuisines préférées", () => {
    expect(scoreRecette(recette(), contexte({ notes: new Map([["r1", 3]]) })).details.note).toBe(
      1,
    );
    expect(scoreRecette(recette(), contexte({ notes: new Map([["r1", 1]]) })).details.note).toBe(
      -1,
    );
    expect(
      scoreRecette(recette(), contexte({ cuisinesPreferees: ["ivoirienne"] })).details.cuisine,
    ).toBe(1);
  });

  it("additionne les critères avec leurs poids", () => {
    const c = contexte({ notes: new Map([["r1", 3]]), aConsommerVite: new Set(["riz"]) });
    expect(scoreRecette(recette({ coutParPortionFcfa: 200 }), c).total).toBe(
      POIDS.budget * 0.5 + POIDS.stock + POIDS.note,
    );
  });

  it("classe les recettes de la meilleure à la moins bonne", () => {
    const chere = recette({ id: "chere", coutParPortionFcfa: 800 });
    const douce = recette({ id: "douce", coutParPortionFcfa: 100 });
    expect(classer([chere, douce], contexte()).map((r) => r.id)).toEqual(["douce", "chere"]);
  });
});

describe("ingrédient principal", () => {
  it("prend la viande ou le poisson avant le féculent", () => {
    const r = recette({
      ingredients: [
        { id: "riz", category: "féculent", seasonalMonths: toutLAnnee, grams: 800, optional: false },
        {
          id: "poulet",
          category: "volaille",
          seasonalMonths: toutLAnnee,
          grams: 600,
          optional: false,
        },
      ],
    });
    expect(ingredientPrincipal(r)).toBe("poulet");
  });

  it("prend le plus lourd quand il n'y a ni viande ni poisson", () => {
    expect(ingredientPrincipal(recette())).toBe("riz");
  });
});
