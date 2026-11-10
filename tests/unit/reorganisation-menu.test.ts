import { describe, expect, it } from "vitest";
import {
  NOUVEAUREPAS,
  changerPortionsRepas,
  decalerDiners,
  echangerRepas,
  versMenuVerifiable,
  type RepasPlace,
} from "@/lib/planificateur/reorganisation";
import { verifierMenu, type RecetteAVerifier } from "@/lib/planificateur/verification";

// Semaine du lundi 26 octobre 2026, foyer de 4 personnes, 100 FCFA la portion.
const WEEKSTART = new Date("2026-10-26T00:00:00Z");
const PERSONNES = 4;
const parametres = { personnes: PERSONNES, weekStart: WEEKSTART, budgetFcfa: 1_000_000 };

/** Déjeuner L0…L6 et dîner D0…D6 ; `doubles` : dîners cuisinés en double, leur reste le lendemain midi. */
function semaine(doubles: number[] = []): RepasPlace[] {
  const repas: RepasPlace[] = [];
  for (let jour = 0; jour < 7; jour++) {
    const resteDe = doubles.includes(jour - 1) ? `D${jour - 1}` : null;
    repas.push({
      id: `L${jour}`,
      recipeId: resteDe ? `rD${jour - 1}` : `rL${jour}`,
      jour,
      slot: "lunch",
      servings: PERSONNES,
      leftoverFromId: resteDe,
    });
    repas.push({
      id: `D${jour}`,
      recipeId: `rD${jour}`,
      jour,
      slot: "dinner",
      servings: doubles.includes(jour) ? 2 * PERSONNES : PERSONNES,
      leftoverFromId: null,
    });
  }
  return repas;
}

const recette = (
  id: string,
  minutes = 30,
  mealTypes: ("lunch" | "dinner")[] = ["lunch", "dinner"],
) =>
  ({
    id,
    mealTypes,
    minutes,
    coutParPortionFcfa: 100,
    principal: null,
    ingredients: [],
  }) satisfies RecetteAVerifier;

const catalogue = (...speciales: RecetteAVerifier[]): RecetteAVerifier[] => {
  const ids = [0, 1, 2, 3, 4, 5, 6].flatMap((j) => [`rL${j}`, `rD${j}`]);
  return [
    ...ids.filter((id) => !speciales.some((s) => s.id === id)).map((id) => recette(id)),
    ...speciales,
  ];
};

function problemes(repas: RepasPlace[], recettes = catalogue(), portionsLibres = true) {
  const menu = versMenuVerifiable(repas, () => 100);
  return verifierMenu(menu, recettes, [], parametres, { portionsLibres }).map((p) => p.code);
}

const place = (repas: RepasPlace[], id: string) => {
  const r = repas.find((x) => x.id === id)!;
  return `${r.jour}:${r.slot}`;
};

describe("déplacer un repas", () => {
  it("échange deux dîners quand le créneau visé est pris", () => {
    const apres = echangerRepas(semaine(), "D1", 3, "dinner");
    expect(place(apres, "D1")).toBe("3:dinner");
    expect(place(apres, "D3")).toBe("1:dinner");
    expect(problemes(apres)).toEqual([]);
  });

  it("un dîner cuisiné en double emmène son reste au lendemain midi", () => {
    // D0 en double, son reste est mangé mardi midi (L1)
    const apres = echangerRepas(semaine([0]), "D0", 2, "dinner");
    expect(place(apres, "D0")).toBe("2:dinner");
    expect(place(apres, "L1")).toBe("3:lunch");
    expect(place(apres, "L3")).toBe("1:lunch");
    expect(place(apres, "D2")).toBe("0:dinner");
    expect(problemes(apres)).toEqual([]);
  });

  it("refuse de déplacer un reste seul", () => {
    expect(() => echangerRepas(semaine([0]), "L1", 4, "lunch")).toThrow(/reste du dîner/);
  });

  it("refuse de prendre la place d'un reste", () => {
    expect(() => echangerRepas(semaine([0]), "L4", 1, "lunch")).toThrow(/reste du dîner/);
  });

  it("refuse un dîner en double poussé au dernier soir : ses restes n'auraient plus de lendemain", () => {
    expect(() => echangerRepas(semaine([0]), "D0", 6, "dinner")).toThrow(/plus dans la semaine/);
  });

  it("la vérification refuse un plat de 90 min déplacé un soir de semaine", () => {
    // Le dîner du samedi (D5) est long ; échangé avec le mardi soir
    const apres = echangerRepas(semaine(), "D5", 1, "dinner");
    expect(problemes(apres, catalogue(recette("rD5", 90)))).toContain("TEMPSDEPASSE");
  });

  it("la vérification refuse un plat de midi déplacé au dîner", () => {
    const apres = echangerRepas(semaine(), "L2", 2, "dinner");
    expect(problemes(apres, catalogue(recette("rL2", 30, ["lunch"])))).toContain("CRENEAU");
  });
});

describe("mode urgence : les dîners glissent d'un jour", () => {
  it("le plat rapide est servi ce soir, la suite glisse, le dernier dîner sort du menu", () => {
    // Mercredi soir (jour 2)
    const { repas, retires } = decalerDiners(semaine(), 2, "rapide", PERSONNES);
    const rapide = repas.find((r) => r.id === NOUVEAUREPAS)!;
    expect(rapide).toMatchObject({ recipeId: "rapide", jour: 2, slot: "dinner", servings: 4 });
    expect(place(repas, "D2")).toBe("3:dinner");
    expect(place(repas, "D5")).toBe("6:dinner");
    expect(retires).toEqual(["D6"]);
    expect(problemes(repas, [...catalogue(), recette("rapide", 15)])).toEqual([]);
  });

  it("ne touche ni aux repas d'avant ni aux déjeuners ordinaires", () => {
    const { repas } = decalerDiners(semaine(), 2, "rapide", PERSONNES);
    for (const id of ["L0", "D0", "L1", "D1", "L2", "L3", "L4", "L5", "L6"]) {
      expect(repas.find((r) => r.id === id)!.jour, id).toBe(
        semaine().find((r) => r.id === id)!.jour,
      );
    }
  });

  it("le reste suit son dîner, et le déjeuner ordinaire prend la place libérée", () => {
    // Mercredi soir (D2) cuisiné en double : son reste est jeudi midi (L3)
    const { repas, retires } = decalerDiners(semaine([2]), 2, "rapide", PERSONNES);
    expect(place(repas, "D2")).toBe("3:dinner");
    expect(place(repas, "L3")).toBe("4:lunch");
    expect(place(repas, "L4")).toBe("3:lunch");
    expect(retires).toEqual(["D6"]);
    expect(problemes(repas, [...catalogue(), recette("rapide", 15)])).toEqual([]);
  });

  it("avant-dernier soir cuisiné en double : son plat est mangé dimanche midi, dimanche soir est gardé", () => {
    // Samedi soir (D5) en double, son reste dimanche midi (L6) : il ne peut pas glisser au dimanche soir
    const { repas, retires } = decalerDiners(semaine([5]), 2, "rapide", PERSONNES);
    expect(retires).toEqual(["L6"]);
    expect(repas.find((r) => r.id === "D5")).toMatchObject({
      jour: 6,
      slot: "lunch",
      servings: PERSONNES,
    });
    expect(place(repas, "D6")).toBe("6:dinner");
    expect(place(repas, "D4")).toBe("5:dinner");
    expect(repas.filter((r) => r.slot !== "breakfast")).toHaveLength(14);
    expect(problemes(repas, [...catalogue(), recette("rapide", 15)])).toEqual([]);
  });

  it("menu où tous les dîners de la semaine sont cuisinés en double : rien n'est perdu", () => {
    // Comme le compose le code : chaque dîner du lundi au samedi a son reste le lendemain midi
    const { repas } = decalerDiners(semaine([0, 1, 2, 3, 4, 5]), 1, "rapide", PERSONNES);
    expect(place(repas, "D1")).toBe("2:dinner");
    expect(place(repas, "L2")).toBe("3:lunch");
    expect(place(repas, "D6")).toBe("6:dinner");
    expect(problemes(repas, [...catalogue(), recette("rapide", 15)])).toEqual([]);
  });

  it("samedi soir en double et urgence ce samedi : le plat prévu passe à dimanche midi", () => {
    const { repas, retires } = decalerDiners(semaine([5]), 5, "rapide", PERSONNES);
    expect(retires).toEqual(["L6"]);
    expect(place(repas, "D5")).toBe("6:lunch");
    expect(place(repas, "D6")).toBe("6:dinner");
    expect(problemes(repas, [...catalogue(), recette("rapide", 15)])).toEqual([]);
  });

  it("refuse le dernier soir de la semaine : il n'y a pas de lendemain", () => {
    expect(() => decalerDiners(semaine(), 6, "rapide", PERSONNES)).toThrow(/dernier soir/);
  });

  it("la vérification refuse un plat long qui glisse sur un soir de semaine", () => {
    // Mercredi soir (D2) est long : il glisserait au jeudi soir
    const { repas } = decalerDiners(semaine(), 2, "rapide", PERSONNES);
    expect(problemes(repas, [...catalogue(recette("rD2", 90)), recette("rapide", 15)])).toContain(
      "TEMPSDEPASSE",
    );
  });
});

describe("changer les portions", () => {
  it("un dîner en double garde son reste : 6 ce soir + 4 demain midi = 10 portions cuisinées", () => {
    const apres = changerPortionsRepas(semaine([0]), "D0", 6);
    expect(apres.find((r) => r.id === "D0")!.servings).toBe(10);
    expect(apres.find((r) => r.id === "L1")!.servings).toBe(4);
    expect(problemes(apres)).toEqual([]);
  });

  it("plus de portions pour le reste : le dîner de la veille en cuisine davantage", () => {
    const apres = changerPortionsRepas(semaine([0]), "L1", 6);
    expect(apres.find((r) => r.id === "D0")!.servings).toBe(10);
    expect(problemes(apres)).toEqual([]);
  });

  it("un repas simple prend le nombre de portions demandé", () => {
    const apres = changerPortionsRepas(semaine(), "D3", 7);
    expect(apres.find((r) => r.id === "D3")!.servings).toBe(7);
    expect(problemes(apres)).toEqual([]);
  });

  it("le coût suit les portions et la vérification refuse un budget dépassé", () => {
    const apres = changerPortionsRepas(semaine(), "D3", 20);
    const menu = versMenuVerifiable(apres, () => 100);
    const petitBudget = { ...parametres, budgetFcfa: menu.totalFcfa - 1 };
    const codes = verifierMenu(menu, catalogue(), [], petitBudget, { portionsLibres: true }).map(
      (p) => p.code,
    );
    expect(codes).toEqual(["BUDGETDEPASSE"]);
  });

  it("sans portionsLibres, la vérification du menu généré reste stricte", () => {
    expect(problemes(changerPortionsRepas(semaine(), "D3", 7), catalogue(), false)).toContain(
      "RESTEINCOHERENT",
    );
  });
});
