import { describe, expect, it } from "vitest";
import {
  composerMenu,
  type Candidat,
  type MenuCompose,
  type ParametresComposition,
} from "@/lib/planificateur/composition";
import type { RestrictionAFiltrer } from "@/lib/planificateur/filtres";
import { verifierMenu, type RecetteAVerifier } from "@/lib/planificateur/verification";

// Lundi 26 octobre 2026
const lundi = new Date("2026-10-26T00:00:00.000Z");

const parametres = (partiel: Partial<ParametresComposition> = {}): ParametresComposition => ({
  personnes: 4,
  weekStart: lundi,
  budgetFcfa: 25000,
  ...partiel,
});

const recette = (id: string): RecetteAVerifier => ({
  id,
  mealTypes: ["lunch", "dinner"],
  minutes: 30,
  coutParPortionFcfa: 300,
  principal: id,
  ingredients: [{ name: "riz", category: "féculent", allergens: [] }],
});

const recettes = () => Array.from({ length: 10 }, (_, i) => recette(`r${i + 1}`));

function menuDe(candidats: Candidat[]): MenuCompose {
  const resultat = composerMenu(candidats, parametres());
  if (!resultat.ok) throw new Error(`Composition refusée : ${resultat.code}`);
  return resultat.menu;
}

const indice = (menu: MenuCompose, jour: number, slot: "lunch" | "dinner") =>
  menu.repas.findIndex((r) => r.jour === jour && r.slot === slot);

function verifier(
  modifier: (menu: MenuCompose, liste: RecetteAVerifier[]) => void = () => {},
  restrictions: RestrictionAFiltrer[] = [],
  p = parametres(),
) {
  const liste = recettes();
  const menu = structuredClone(menuDe(liste));
  modifier(menu, liste);
  return verifierMenu(menu, liste, restrictions, p);
}

const codes = (problemes: ReturnType<typeof verifier>) => problemes.map((p) => p.code);

const recetteDu = (
  menu: MenuCompose,
  liste: RecetteAVerifier[],
  jour: number,
  slot: "lunch" | "dinner",
) => liste.find((r) => r.id === menu.repas[indice(menu, jour, slot)].recetteId) as RecetteAVerifier;

describe("vérification du menu", () => {
  it("accepte un menu composé par le code", () => {
    expect(verifier()).toEqual([]);
  });

  it("refuse un repas qui contient l'allergène d'un membre", () => {
    const problemes = verifier(
      (menu, liste) => {
        recetteDu(menu, liste, 0, "lunch").ingredients.push({
          name: "pâte d'arachide",
          category: "oléagineux",
          allergens: ["arachide"],
        });
      },
      [{ membre: "Enfant 1", type: "allergy", value: "arachide" }],
    );
    expect(codes(problemes)).toEqual(["INCOMPATIBLE"]);
    expect(problemes[0].message).toContain("Enfant 1");
  });

  it("refuse de la viande pour un membre végétarien, reste compris", () => {
    const problemes = verifier(
      (menu, liste) => {
        recetteDu(menu, liste, 0, "dinner").ingredients.push({
          name: "bœuf",
          category: "viande",
          allergens: [],
        });
      },
      [{ membre: "Adulte 1", type: "diet", value: "vegetarien" }],
    );
    // Le dîner et son reste du lendemain midi
    expect(codes(problemes)).toEqual(["INCOMPATIBLE", "INCOMPATIBLE"]);
  });

  it("refuse une recette servie à un repas qui n'est pas le sien", () => {
    const problemes = verifier((menu, liste) => {
      recetteDu(menu, liste, 6, "dinner").mealTypes = ["lunch"];
    });
    expect(codes(problemes)).toEqual(["CRENEAU"]);
  });

  it("refuse un dîner de semaine trop long, pas un dîner du week-end", () => {
    expect(
      codes(
        verifier((menu, liste) => {
          recetteDu(menu, liste, 6, "dinner").minutes = 90;
        }),
      ),
    ).toEqual([]);
    expect(
      codes(
        verifier((menu, liste) => {
          recetteDu(menu, liste, 0, "dinner").minutes = 90;
        }),
      ),
    ).toEqual(["TEMPSDEPASSE"]);
  });

  it("refuse une recette cuisinée deux fois", () => {
    const problemes = verifier((menu) => {
      menu.repas[indice(menu, 6, "dinner")].recetteId =
        menu.repas[indice(menu, 0, "lunch")].recetteId;
    });
    expect(codes(problemes)).toEqual(["RECETTEREPETEE"]);
  });

  it("refuse un reste qui ne vient pas du dîner de la veille", () => {
    const problemes = verifier((menu) => {
      menu.repas[indice(menu, 1, "lunch")].recetteId =
        menu.repas[indice(menu, 2, "dinner")].recetteId;
    });
    expect(codes(problemes)).toEqual(["RESTEINCOHERENT"]);
  });

  it("refuse un dîner cuisiné en double sans reste le lendemain", () => {
    const problemes = verifier((menu) => {
      const dimanche = menu.repas[indice(menu, 6, "dinner")];
      dimanche.portions = 8;
      dimanche.coutFcfa *= 2;
      menu.totalFcfa += dimanche.coutFcfa / 2;
    });
    expect(codes(problemes)).toEqual(["RESTEINCOHERENT"]);
  });

  it("refuse une recette absente du catalogue", () => {
    const liste = recettes();
    const menu = menuDe(liste);
    const sansPremiere = liste.filter((r) => r.id !== menu.repas[0].recetteId);
    expect(codes(verifierMenu(menu, sansPremiere, [], parametres()))).toEqual(["RECETTEINCONNUE"]);
  });

  it("refuse un menu auquel il manque un repas", () => {
    const problemes = verifier((menu) => {
      const dernier = menu.repas.pop();
      menu.totalFcfa -= dernier?.coutFcfa ?? 0;
    });
    expect(codes(problemes)).toEqual(["NOMBREREPAS", "NOMBREREPAS"]);
  });

  it("recalcule les coûts au lieu de faire confiance au menu", () => {
    expect(
      codes(
        verifier((menu) => {
          menu.totalFcfa += 1;
        }),
      ),
    ).toEqual(["COUTINCORRECT"]);
    expect(
      codes(
        verifier((menu) => {
          menu.repas[0].coutFcfa -= 100;
          menu.totalFcfa -= 100;
        }),
      ),
    ).toEqual(["COUTINCORRECT"]);
  });

  it("refuse un menu qui dépasse le budget", () => {
    const problemes = verifier(undefined, [], parametres({ budgetFcfa: 10000 }));
    expect(problemes).toEqual([
      { code: "BUDGETDEPASSE", message: "Le menu dépasse le budget de la semaine." },
    ]);
  });
});
