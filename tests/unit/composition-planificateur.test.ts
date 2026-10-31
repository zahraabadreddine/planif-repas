import { describe, expect, it } from "vitest";
import {
  TEMPSMAXSOIRSEMAINE,
  composerMenu,
  estJourDeSemaine,
  type Candidat,
  type MenuCompose,
  type ParametresComposition,
} from "@/lib/planificateur/composition";

// Lundi 26 octobre 2026
const lundi = new Date("2026-10-26T00:00:00.000Z");

const parametres = (partiel: Partial<ParametresComposition> = {}): ParametresComposition => ({
  personnes: 4,
  weekStart: lundi,
  budgetFcfa: 25000,
  ...partiel,
});

const candidat = (id: string, partiel: Partial<Candidat> = {}): Candidat => ({
  id,
  mealTypes: ["lunch", "dinner"],
  minutes: 30,
  coutParPortionFcfa: 300,
  principal: id,
  ...partiel,
});

const plusieurs = (nombre: number, partiel: Partial<Candidat> = {}) =>
  Array.from({ length: nombre }, (_, i) => candidat(`r${i + 1}`, partiel));

function menuDe(candidats: Candidat[], p = parametres()): MenuCompose {
  const resultat = composerMenu(candidats, p);
  if (!resultat.ok) throw new Error(`Composition refusée : ${resultat.code}`);
  return resultat.menu;
}

const cuisines = (menu: MenuCompose) => menu.repas.filter((r) => r.resteDe === null);

describe("jours de semaine", () => {
  it("compte du lundi au vendredi", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((jour) => estJourDeSemaine(lundi, jour))).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
      false,
    ]);
  });
});

describe("composition du menu", () => {
  it("remplit le déjeuner et le dîner des 7 jours", () => {
    const menu = menuDe(plusieurs(10));
    expect(menu.repas).toHaveLength(14);
    for (let jour = 0; jour < 7; jour++) {
      expect(menu.repas.filter((r) => r.jour === jour).map((r) => r.slot)).toEqual([
        "lunch",
        "dinner",
      ]);
    }
  });

  it("sert le dîner cuisiné en double au déjeuner du lendemain", () => {
    const menu = menuDe(plusieurs(10));
    const restes = menu.repas.filter((r) => r.resteDe !== null);
    expect(restes).toHaveLength(6);
    for (const reste of restes) {
      const diner = menu.repas[reste.resteDe as number];
      expect(diner.slot).toBe("dinner");
      expect(diner.jour).toBe(reste.jour - 1);
      expect(diner.recetteId).toBe(reste.recetteId);
      expect(diner.portions).toBe(8);
      expect(reste.portions).toBe(4);
      expect(reste.coutFcfa).toBe(0);
    }
    // Le dîner du dimanche n'a pas de lendemain dans la semaine
    expect(menu.repas.at(-1)?.portions).toBe(4);
  });

  it("ne cuisine pas deux fois la même recette", () => {
    const ids = cuisines(menuDe(plusieurs(10))).map((r) => r.recetteId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("garde les dîners de semaine sous le temps maximum, pas ceux du week-end", () => {
    const longue = candidat("longue", { mealTypes: ["dinner"], minutes: 120 });
    const candidats = [longue, ...plusieurs(8)];
    const menu = menuDe(candidats);
    const minutes = new Map(candidats.map((c) => [c.id, c.minutes]));
    for (const repas of menu.repas.filter((r) => r.slot === "dinner" && r.jour < 5)) {
      expect(minutes.get(repas.recetteId)).toBeLessThanOrEqual(TEMPSMAXSOIRSEMAINE);
    }
    const samedi = menu.repas.find((r) => r.jour === 5 && r.slot === "dinner");
    expect(samedi?.recetteId).toBe("longue");
    // Un plat servi seulement le soir n'est pas cuisiné en double
    expect(samedi?.portions).toBe(4);
    expect(menu.repas.find((r) => r.jour === 6 && r.slot === "lunch")?.resteDe).toBeNull();
  });

  it("ne répète pas un ingrédient principal quand il y a assez de recettes", () => {
    const candidats = [...plusieurs(8), candidat("r9", { principal: "r1" })];
    const menu = menuDe(candidats);
    expect(menu.principauxRepetes).toEqual([]);
    expect(cuisines(menu).map((r) => r.recetteId)).not.toContain("r9");
  });

  it("signale l'ingrédient principal répété faute d'assez de recettes", () => {
    const candidats = [...plusieurs(7), candidat("r8", { principal: "r1" })];
    expect(menuDe(candidats).principauxRepetes).toEqual(["r1"]);
  });

  it("additionne le coût des repas cuisinés sans dépasser le budget", () => {
    const menu = menuDe(plusieurs(10));
    expect(menu.totalFcfa).toBe(menu.repas.reduce((somme, r) => somme + r.coutFcfa, 0));
    // 14 couverts de 4 portions à 300 FCFA
    expect(menu.totalFcfa).toBe(16800);
  });

  it("écarte les recettes trop chères pour tenir le budget", () => {
    const cheres = plusieurs(8, { coutParPortionFcfa: 600 }).map((c) => ({
      ...c,
      id: `chere-${c.id}`,
      principal: `chere-${c.id}`,
    }));
    const menu = menuDe(
      [...cheres, ...plusieurs(8, { coutParPortionFcfa: 200 })],
      parametres({
        budgetFcfa: 11200,
      }),
    );
    expect(menu.totalFcfa).toBe(11200);
    expect(menu.repas.some((r) => r.recetteId.startsWith("chere"))).toBe(false);
  });

  // Une personne : la meilleure recette coûte 300, la moins chère 100, les autres 150
  const serres = [
    candidat("chere", { coutParPortionFcfa: 300 }),
    candidat("c1", { coutParPortionFcfa: 100 }),
    ...plusieurs(7, { coutParPortionFcfa: 150 }),
  ];

  it("revient aux recettes les moins chères quand le classement ne tient pas le budget", () => {
    const menu = menuDe(serres, parametres({ personnes: 1, budgetFcfa: 2050 }));
    expect(menu.totalFcfa).toBe(2050);
    expect(menu.repas.map((r) => r.recetteId)).not.toContain("chere");
  });

  it("refuse avec BUDGETINSUFFISANT quand même le menu le moins cher dépasse", () => {
    expect(composerMenu(serres, parametres({ personnes: 1, budgetFcfa: 2000 }))).toEqual({
      ok: false,
      code: "BUDGETINSUFFISANT",
    });
    expect(composerMenu(plusieurs(10, { coutParPortionFcfa: 1000 }), parametres())).toEqual({
      ok: false,
      code: "BUDGETINSUFFISANT",
    });
  });

  it("refuse avec RECETTESINSUFFISANTES quand il manque des recettes", () => {
    expect(composerMenu(plusieurs(3), parametres())).toEqual({
      ok: false,
      code: "RECETTESINSUFFISANTES",
    });
    expect(composerMenu([], parametres())).toEqual({ ok: false, code: "RECETTESINSUFFISANTES" });
  });
});

describe("cas d'Aminata", () => {
  // Recettes du seed, sauce arachide déjà écartée par les filtres durs (allergie de l'enfant)
  const recettes: Candidat[] = [
    candidat("garba", { coutParPortionFcfa: 350, principal: "thon" }),
    candidat("attieke-poisson", { minutes: 55, coutParPortionFcfa: 450, principal: "poisson" }),
    candidat("alloco-oeufs", { coutParPortionFcfa: 300, principal: "oeufs" }),
    candidat("sauce-graine", {
      mealTypes: ["lunch"],
      minutes: 120,
      coutParPortionFcfa: 500,
      principal: "poisson-fume",
    }),
    candidat("riz-gras", { minutes: 70, coutParPortionFcfa: 400, principal: "boeuf" }),
    candidat("kedjenou", { minutes: 70, coutParPortionFcfa: 550, principal: "poulet" }),
    candidat("placali-gombo", {
      mealTypes: ["lunch"],
      minutes: 70,
      coutParPortionFcfa: 400,
      principal: "crabe",
    }),
    candidat("spaghetti", { mealTypes: ["dinner"], coutParPortionFcfa: 300 }),
    candidat("aubergines-oeufs", { minutes: 20, coutParPortionFcfa: 250, principal: "aubergine" }),
    candidat("taboule", { coutParPortionFcfa: 300, principal: "boulgour" }),
    candidat("houmous", { minutes: 105, coutParPortionFcfa: 350, principal: "pois-chiches" }),
    candidat("moujaddara", { minutes: 60, coutParPortionFcfa: 300, principal: "lentilles" }),
  ];

  it("compose une semaine pour 4 personnes à 25 000 FCFA", () => {
    const menu = menuDe(recettes);
    const minutes = new Map(recettes.map((c) => [c.id, c.minutes]));
    expect(menu.repas).toHaveLength(14);
    expect(menu.totalFcfa).toBeLessThanOrEqual(25000);
    expect(menu.repas.every((r) => r.recetteId !== "sauce-arachide-poulet")).toBe(true);
    for (const repas of menu.repas.filter((r) => r.slot === "dinner" && r.jour < 5)) {
      expect(minutes.get(repas.recetteId)).toBeLessThanOrEqual(TEMPSMAXSOIRSEMAINE);
    }
    expect(menu.principauxRepetes).toEqual([]);
  });
});
