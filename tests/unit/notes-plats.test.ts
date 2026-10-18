import { describe, expect, it } from "vitest";
import { ingredientsDepart, recettesDepart } from "../../prisma/donnees-depart";
import { platsANoter, type RecetteANoter } from "@/lib/foyer/notes";
import type { RestrictionAFiltrer } from "@/lib/planificateur/filtres";
import { TAILLESERIE, noteSchema } from "@/lib/validation/note";

const catalogue = new Map(ingredientsDepart.map((i) => [i.name, i]));
const recettes: RecetteANoter[] = recettesDepart.map((r) => ({
  id: r.title,
  title: r.title,
  cuisine: r.cuisine,
  validated: r.validated,
  ingredients: r.ingredients.map((l) => catalogue.get(l.name)!),
}));
const arachide: RestrictionAFiltrer = { membre: "Awa", type: "allergy", value: "arachide" };

describe("plats proposés à la notation", () => {
  it("propose tous les plats, validés ou non, à un foyer sans restriction", () => {
    expect(platsANoter(recettes, [], new Map(), [])).toHaveLength(recettesDepart.length);
  });

  it("ne propose jamais la sauce arachide à un foyer allergique à l'arachide", () => {
    const plats = platsANoter(recettes, [arachide], new Map(), []);
    expect(plats.map((p) => p.title)).not.toContain("Sauce arachide au poulet");
    expect(plats.length).toBeLessThan(recettesDepart.length);
  });

  it("commence par les cuisines préférées du foyer, dans leur ordre", () => {
    const plats = platsANoter(recettes, [], new Map(), ["libanaise", "indienne"]);
    expect(plats[0].cuisine).toBe("libanaise");
    expect(plats[1].cuisine).toBe("indienne");
  });

  it("varie les cuisines : un plat par cuisine à tour de rôle dans la première série", () => {
    const premiers = platsANoter(recettes, [], new Map(), []).slice(0, TAILLESERIE);
    const cuisines = new Set(recettesDepart.map((r) => r.cuisine));
    expect(new Set(premiers.map((p) => p.cuisine)).size).toBe(Math.min(cuisines.size, TAILLESERIE));
  });

  it("propose d'abord les recettes validées dans chaque cuisine", () => {
    const plats = platsANoter(recettes, [], new Map(), ["libanaise"]);
    expect(plats[0].title).toBe("Taboulé");
  });

  it("garde toutes les recettes compatibles, sans doublon", () => {
    const plats = platsANoter(recettes, [], new Map(), ["italienne"]);
    expect(new Set(plats.map((p) => p.id)).size).toBe(recettesDepart.length);
  });

  it("reprend la note déjà donnée et ignore une valeur hors de 1 à 3", () => {
    const plats = platsANoter(
      recettes,
      [],
      new Map([
        ["Garba", 3],
        ["Taboulé", 7],
      ]),
      [],
    );
    expect(plats.find((p) => p.title === "Garba")?.rating).toBe(3);
    expect(plats.find((p) => p.title === "Taboulé")?.rating).toBeNull();
    expect(plats.find((p) => p.title === "Crêpes")?.rating).toBeNull();
  });
});

describe("règles d'une note", () => {
  const id = "8f2b4c1e-3d5a-4e6f-9a7b-1c2d3e4f5a6b";

  it("accepte 1, 2, 3 ou null (retirer la note)", () => {
    for (const rating of [1, 2, 3, null]) {
      expect(noteSchema.safeParse({ recipeId: id, rating }).success, String(rating)).toBe(true);
    }
  });

  it("refuse une autre note, un plat mal formé ou un champ en trop", () => {
    expect(noteSchema.safeParse({ recipeId: id, rating: 4 }).success).toBe(false);
    expect(noteSchema.safeParse({ recipeId: id, rating: 0 }).success).toBe(false);
    expect(noteSchema.safeParse({ recipeId: "garba", rating: 3 }).success).toBe(false);
    expect(noteSchema.safeParse({ recipeId: id, rating: 3, householdId: "f2" }).success).toBe(
      false,
    );
  });
});
