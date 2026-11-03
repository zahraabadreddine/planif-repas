import { describe, expect, it } from "vitest";
import type { ReleveDuLieu } from "@/lib/catalogue/cout";
import { listeDeCourses, type IngredientPourListe, type RepasPourListe } from "@/lib/courses/liste";

const maintenant = new Date("2026-10-18T12:00:00Z");
const recent = new Date("2026-10-11T12:00:00Z");

const au = (
  placeType: ReleveDuLieu["placeType"],
  priceFcfa: number,
  source: ReleveDuLieu["source"] = "team",
): ReleveDuLieu => ({ priceFcfa, grams: 1000, source, observedAt: recent, placeType });

const ingredients = new Map<string, IngredientPourListe>([
  [
    "tomate",
    { name: "Tomate", uniteAchat: { label: "tas", grams: 500 }, releves: [au("market", 1000)] },
  ],
  [
    "riz",
    {
      name: "Riz",
      uniteAchat: { label: "sachet de 1 kg", grams: 1000 },
      releves: [au("supermarket", 700)],
    },
  ],
  ["gombo", { name: "Gombo", uniteAchat: { label: "tas", grams: 250 }, releves: [] }],
]);

const repas = (
  servings: number,
  lignes: [string, number, boolean?][],
  servingsRecette = 4,
): RepasPourListe => ({
  servings,
  recette: {
    servings: servingsRecette,
    ingredients: lignes.map(([ingredientId, grams, optional = false]) => ({
      ingredientId,
      grams,
      optional,
    })),
  },
});

describe("liste de courses", () => {
  it("additionne les repas et arrondit à l'unité supérieure : 1,4 kg de tomates donne 3 tas", () => {
    const liste = listeDeCourses(
      [repas(4, [["tomate", 900]]), repas(4, [["tomate", 500]])],
      [],
      ingredients,
      maintenant,
    );
    expect(liste.articles).toHaveLength(1);
    expect(liste.articles[0]).toMatchObject({
      ingredient: "Tomate",
      quantite: 3,
      placeType: "market",
    });
    // On paie les 3 tas achetés (1,5 kg), pas les 1,4 kg nécessaires
    expect(liste.articles[0].prixFcfa).toBe(1500);
  });

  it("ajuste les quantités au nombre de portions servies", () => {
    const liste = listeDeCourses([repas(8, [["riz", 600]])], [], ingredients, maintenant);
    expect(liste.articles[0].quantite).toBe(2);
  });

  it("un ingrédient en stock en quantité suffisante n'apparaît pas dans la liste", () => {
    const liste = listeDeCourses(
      [
        repas(4, [
          ["tomate", 900],
          ["riz", 500],
        ]),
      ],
      [{ ingredientId: "tomate", grams: 1000 }],
      ingredients,
      maintenant,
    );
    expect(liste.articles.map((a) => a.ingredient)).toEqual(["Riz"]);
  });

  it("un stock insuffisant réduit seulement la quantité à acheter", () => {
    const liste = listeDeCourses(
      [repas(4, [["tomate", 1400]])],
      [{ ingredientId: "tomate", grams: 600 }],
      ingredients,
      maintenant,
    );
    expect(liste.articles[0].quantite).toBe(2);
  });

  it("ignore les ingrédients facultatifs", () => {
    const liste = listeDeCourses([repas(4, [["tomate", 500, true]])], [], ingredients, maintenant);
    expect(liste.articles).toEqual([]);
  });

  it("exclut du total un article sans prix et le signale", () => {
    const liste = listeDeCourses(
      [
        repas(4, [
          ["riz", 1000],
          ["gombo", 300],
        ]),
      ],
      [],
      ingredients,
      maintenant,
    );
    expect(liste.totalFcfa).toBe(700);
    expect(liste.sansPrix).toEqual(["Gombo"]);
    expect(liste.articles.find((a) => a.ingredient === "Gombo")).toMatchObject({
      quantite: 2,
      prixFcfa: null,
      placeType: null,
      nature: "inconnu",
    });
  });

  it("le total est un entier en FCFA", () => {
    const liste = listeDeCourses(
      [
        repas(4, [
          ["tomate", 400],
          ["riz", 300],
        ]),
      ],
      [],
      new Map([
        [
          "tomate",
          {
            name: "Tomate",
            uniteAchat: { label: "tas", grams: 333 },
            releves: [au("market", 1000)],
          },
        ],
        [
          "riz",
          { name: "Riz", uniteAchat: { label: "kg", grams: 1000 }, releves: [au("market", 655)] },
        ],
      ]),
      maintenant,
    );
    expect(Number.isInteger(liste.totalFcfa)).toBe(true);
  });
});
