import { describe, expect, it } from "vitest";
import { filtrerCatalogue } from "@/lib/catalogue/recherche";
import type { RecetteResume } from "@/lib/catalogue/recherche";

// Un plat gardé par la famille n'a pas de durée connue : il ne passe pas pour un plat rapide.

const recette = (title: string, minutes: number, tags: string[] = []) =>
  ({
    id: title,
    title,
    cuisine: "maison",
    minutes,
    difficulty: 2,
    servings: 20,
    tags,
    ingredients: [],
    cout: { totalFcfa: 1000, parPersonneFcfa: 50, avecReleve: 1, avecEstimation: 0, sansPrix: [] },
    incompatibilites: [],
  }) as RecetteResume;

describe("plats du foyer dans le catalogue", () => {
  const recettes = [
    recette("Pain omelette", 10),
    recette("Moutabal", 0, ["plat-du-foyer", "entrée"]),
  ];

  it("apparaissent sans filtre de temps", () => {
    const { recettes: vues } = filtrerCatalogue(recettes, {});
    expect(vues.map((r) => r.title)).toContain("Moutabal");
  });

  it("ne passent pas un filtre « rapide » avec leur durée inconnue", () => {
    const { recettes: vues } = filtrerCatalogue(recettes, { temps: 20 });
    expect(vues.map((r) => r.title)).toEqual(["Pain omelette"]);
  });
});
