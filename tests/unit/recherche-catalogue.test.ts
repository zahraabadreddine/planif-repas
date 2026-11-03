import { describe, expect, it } from "vitest";
import {
  correspond,
  correspondAuTexte,
  filtrerCatalogue,
  type RecetteResume,
} from "@/lib/catalogue/recherche";
import { lireFiltres } from "@/lib/validation/catalogue";

const recette = (modif: Partial<RecetteResume> = {}): RecetteResume => ({
  id: "r1",
  title: "Attiéké poisson braisé",
  cuisine: "ivoirienne",
  minutes: 55,
  difficulty: 1,
  servings: 4,
  tags: ["braise"],
  ingredients: ["Attiéké", "Carpe", "Tomate"],
  cout: { totalFcfa: 4000, parPersonneFcfa: 1000, avecReleve: 2, avecEstimation: 3, sansPrix: [] },
  incompatibilites: [],
  ...modif,
});

describe("recherche dans le catalogue", () => {
  it("ignore les accents et les majuscules", () => {
    expect(correspondAuTexte(recette(), "ATTIEKE")).toBe(true);
  });

  it("cherche aussi dans les ingrédients et les mots-clés", () => {
    expect(correspondAuTexte(recette(), "carpe")).toBe(true);
    expect(correspondAuTexte(recette(), "braise")).toBe(true);
  });

  it("exige que tous les mots tapés soient présents", () => {
    expect(correspondAuTexte(recette(), "attiéké tomate")).toBe(true);
    expect(correspondAuTexte(recette(), "attiéké poulet")).toBe(false);
  });
});

describe("filtres du catalogue", () => {
  it("filtre par origine, temps et coût total de la recette", () => {
    expect(correspond(recette(), { cuisine: "ivoirienne" })).toBe(true);
    expect(correspond(recette(), { cuisine: "libanaise" })).toBe(false);
    expect(correspond(recette(), { temps: 45 })).toBe(false);
    expect(correspond(recette(), { temps: 90 })).toBe(true);
    expect(correspond(recette(), { cout: 2000 })).toBe(false);
    expect(correspond(recette(), { cout: 4000 })).toBe(true);
  });

  it("masque les recettes incompatibles, sauf si on demande de tout afficher", () => {
    const liste = [
      recette(),
      recette({ id: "r2", incompatibilites: [{ membre: "Awa", raison: "arachide" }] }),
    ];
    expect(filtrerCatalogue(liste, {})).toMatchObject({ masquees: 1 });
    expect(filtrerCatalogue(liste, {}).recettes.map((r) => r.id)).toEqual(["r1"]);
    expect(filtrerCatalogue(liste, { tout: "1" }).recettes).toHaveLength(2);
  });
});

describe("lecture des filtres dans l'adresse", () => {
  it("lit les filtres valides", () => {
    expect(
      lireFiltres({ q: " poulet ", cuisine: "libanaise", temps: "45", cout: "4000", tout: "1" }),
    ).toEqual({ q: "poulet", cuisine: "libanaise", temps: 45, cout: 4000, tout: "1" });
  });

  it("ignore un filtre inconnu ou mal écrit au lieu de casser la page", () => {
    expect(lireFiltres({ cuisine: "japonaise", temps: "37", cout: "abc", tout: "oui" })).toEqual(
      {},
    );
  });

  it("prend la première valeur quand un filtre est répété", () => {
    expect(lireFiltres({ cuisine: ["libanaise", "italienne"] })).toEqual({ cuisine: "libanaise" });
  });
});
