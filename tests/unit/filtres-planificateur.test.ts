import { describe, expect, it } from "vitest";
import { ingredientsDepart, recettesDepart } from "../../prisma/donnees-depart";
import { filtrerCatalogue, type RecetteResume } from "@/lib/catalogue/recherche";
import { incompatibilites, type RestrictionAFiltrer } from "@/lib/planificateur/filtres";

const catalogue = new Map(ingredientsDepart.map((i) => [i.name, i]));
const ingredientsDe = (titre: string) =>
  recettesDepart.find((r) => r.title === titre)!.ingredients.map((l) => catalogue.get(l.name)!);

const arachide: RestrictionAFiltrer = { membre: "Awa", type: "allergy", value: "arachide" };

describe("filtres durs : allergies et régimes", () => {
  it("écarte la sauce arachide pour un foyer allergique à l'arachide", () => {
    expect(incompatibilites(ingredientsDe("Sauce arachide au poulet"), [arachide])).toEqual([
      { membre: "Awa", raison: "arachide" },
    ]);
  });

  it("laisse passer une recette sans arachide", () => {
    expect(incompatibilites(ingredientsDe("Taboulé"), [arachide])).toEqual([]);
  });

  it("applique le régime végétarien (viande, volaille, poisson, fruits de mer, porc)", () => {
    const vegetarien: RestrictionAFiltrer = { membre: "Papa", type: "diet", value: "vegetarien" };
    expect(incompatibilites(ingredientsDe("Garba"), [vegetarien])).toHaveLength(1);
    expect(incompatibilites(ingredientsDe("Riz cantonais"), [vegetarien])).toHaveLength(1);
    expect(incompatibilites(ingredientsDe("Dal tadka"), [vegetarien])).toEqual([]);
  });

  it("applique le régime sans porc", () => {
    const sansPorc: RestrictionAFiltrer = { membre: "Maman", type: "diet", value: "sans-porc" };
    expect(incompatibilites(ingredientsDe("Spaghetti bolognaise"), [sansPorc])).toHaveLength(1);
    expect(incompatibilites(ingredientsDe("Riz gras au poulet"), [sansPorc])).toEqual([]);
  });

  it("cherche une autre allergie dans le nom des ingrédients", () => {
    const gombo: RestrictionAFiltrer = { membre: "Awa", type: "allergy", value: "gombo" };
    expect(incompatibilites(ingredientsDe("Placali sauce gombo"), [gombo])).toHaveLength(1);
  });

  it("compte aussi les ingrédients facultatifs, par sécurité", () => {
    const celeri: RestrictionAFiltrer = { membre: "Papa", type: "allergy", value: "celeri" };
    // Dans la soupe de légumes, le céleri est facultatif
    expect(incompatibilites(ingredientsDe("Soupe de légumes"), [celeri])).toHaveLength(1);
  });
});

describe("test obligatoire : jamais d'arachide pour un foyer allergique (CLAUDE.md §14)", () => {
  it("aucune recette du catalogue affiché par défaut ne contient d'arachide", () => {
    const resumes: RecetteResume[] = recettesDepart.map((recette) => {
      const ingredients = recette.ingredients.map((l) => catalogue.get(l.name)!);
      return {
        id: recette.title,
        title: recette.title,
        cuisine: recette.cuisine,
        minutes: recette.prepMinutes + recette.cookMinutes,
        difficulty: recette.difficulty,
        servings: recette.servings,
        tags: recette.tags,
        ingredients: ingredients.map((i) => i.name),
        cout: { totalFcfa: 0, parPersonneFcfa: 0, avecReleve: 0, avecEstimation: 0, sansPrix: [] },
        incompatibilites: incompatibilites(ingredients, [arachide]),
      };
    });
    const { recettes, masquees } = filtrerCatalogue(resumes, {});
    expect(masquees).toBeGreaterThan(0);
    for (const recette of recettes) {
      const contient = recettesDepart
        .find((r) => r.title === recette.title)!
        .ingredients.some((l) => catalogue.get(l.name)!.allergens.includes("arachide"));
      expect(contient, recette.title).toBe(false);
    }
  });
});
