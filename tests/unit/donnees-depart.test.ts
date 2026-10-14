import { describe, expect, it } from "vitest";
import {
  ingredientsDepart,
  recettesDepart,
  unitesGeneriques,
  type IngredientDepart,
} from "../../prisma/donnees-depart";

const parNom = new Map(ingredientsDepart.map((ingredient) => [ingredient.name, ingredient]));
const generiques = new Set(unitesGeneriques.map((unite) => unite.label));

function uniteConnue(ingredient: IngredientDepart, label: string) {
  return generiques.has(label) || ingredient.units.some((unite) => unite.label === label);
}

function allergenesDe(titre: string) {
  const recette = recettesDepart.find((r) => r.title === titre)!;
  return new Set(recette.ingredients.flatMap((ligne) => parNom.get(ligne.name)!.allergens));
}

describe("données de départ du catalogue", () => {
  it("contient une vingtaine de recettes aux titres uniques", () => {
    const titres = recettesDepart.map((r) => r.title);
    expect(titres.length).toBeGreaterThanOrEqual(20);
    expect(new Set(titres).size).toBe(titres.length);
  });

  it("n'a pas deux ingrédients du même nom", () => {
    expect(parNom.size).toBe(ingredientsDepart.length);
  });

  it("n'utilise que des ingrédients et des unités qui existent", () => {
    for (const recette of recettesDepart) {
      for (const ligne of recette.ingredients) {
        const ingredient = parNom.get(ligne.name);
        expect(ingredient, `${recette.title} : ${ligne.name}`).toBeDefined();
        expect(uniteConnue(ingredient!, ligne.unit), `${recette.title} : ${ligne.unit}`).toBe(true);
        expect(ligne.quantity).toBeGreaterThan(0);
      }
    }
  });

  it("donne à chaque ingrédient une unité par défaut et au moins un prix entier en FCFA", () => {
    for (const ingredient of ingredientsDepart) {
      expect(uniteConnue(ingredient, ingredient.defaultUnit), ingredient.name).toBe(true);
      expect(ingredient.prices.length, ingredient.name).toBeGreaterThan(0);
      for (const prix of ingredient.prices) {
        expect(uniteConnue(ingredient, prix.unit), `${ingredient.name} : ${prix.unit}`).toBe(true);
        expect(Number.isInteger(prix.priceFcfa)).toBe(true);
        expect(prix.priceFcfa).toBeGreaterThan(0);
      }
    }
  });

  it("décrit chaque recette avec des étapes, un créneau et une difficulté de 1 à 3", () => {
    for (const recette of recettesDepart) {
      expect(recette.steps.length, recette.title).toBeGreaterThan(0);
      expect(recette.mealTypes.length, recette.title).toBeGreaterThan(0);
      expect(recette.servings).toBeGreaterThan(0);
      expect([1, 2, 3]).toContain(recette.difficulty);
      expect(recette.reference.length, recette.title).toBeGreaterThan(0);
    }
  });

  it("signale l'arachide dans la sauce arachide, pour le filtre des allergies", () => {
    expect(allergenesDe("Sauce arachide au poulet").has("arachide")).toBe(true);
  });

  it("n'ajoute pas d'arachide dans une recette qui n'en contient pas", () => {
    expect(allergenesDe("Garba").has("arachide")).toBe(false);
  });

  it("marque les recettes au four, pour le filtre d'équipement", () => {
    const auFour = recettesDepart.filter((r) => r.tags.includes("four")).map((r) => r.title);
    expect(auFour).toContain("Poulet rôti et pommes de terre");
  });
});
