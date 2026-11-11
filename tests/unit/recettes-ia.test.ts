import { describe, expect, it } from "vitest";
import { ingredientsIa, recettesIa } from "../../prisma/recettes-ia.ts";

// Recettes ajoutées par l'équipe : adaptées au catalogue, sans écraser les recettes existantes,
// et des allergènes justes sur les ingrédients créés (règle 2).

describe("recettes ajoutées par l'équipe", () => {
  const toutes = recettesIa([]);

  it("100 recettes, toutes validées", () => {
    expect(toutes).toHaveLength(100);
    expect(toutes.every((r) => r.validated)).toBe(true);
  });

  it("ne remplace jamais une recette existante du même titre, accents et casse compris", () => {
    const ajoutees = recettesIa(["Crêpes", "sauce arachide au poulet"]);
    expect(ajoutees).toHaveLength(98);
    expect(ajoutees.some((r) => r.title === "Crêpes")).toBe(false);
  });

  it("utilise les noms et unités du catalogue", () => {
    const lignes = toutes.flatMap((r) => r.ingredients);
    const anciensNoms = ["Poivre noir", "Tomate concentrée", "Sucre", "Pâtes", "Lentilles", "Porc"];
    expect(lignes.some((l) => anciensNoms.includes(l.name))).toBe(false);
    expect(lignes.some((l) => l.unit === "L")).toBe(false);
    expect(lignes.filter((l) => l.name === "Poulet" && l.unit === "pièce")).toEqual([]);
  });

  it("une recette qui passe par le four porte l'étiquette « four »", () => {
    const gratin = toutes.find((r) => r.title === "Gratin dauphinois");
    expect(gratin?.tags).toContain("four");
    const sansFour = toutes.find((r) => r.title === "Spaghetti aglio e olio");
    expect(sansFour?.tags).not.toContain("four");
  });
});

describe("ingrédients créés pour ces recettes", () => {
  const parNom = new Map(ingredientsIa.map((i) => [i.name, i]));

  it("les poissons portent l'allergène poisson", () => {
    for (const nom of ["Tilapia", "Maquereau", "Sardine fraîche"]) {
      expect(parNom.get(nom)?.allergens).toContain("poisson");
    }
  });

  it("l'arachide et le fromage portent leur allergène", () => {
    expect(parNom.get("Arachide")?.allergens).toEqual(["arachide"]);
    expect(parNom.get("Fromage râpé")?.allergens).toEqual(["lait"]);
  });

  it("les lardons sont du porc : écartés pour un foyer sans porc", () => {
    expect(parNom.get("Lardons")?.category).toBe("porc");
  });

  it("chaque ingrédient a une unité par défaut et un prix marqué comme estimation", () => {
    for (const i of ingredientsIa) {
      expect(i.defaultUnit).toBeTruthy();
      expect(i.prices.length).toBeGreaterThan(0);
      expect(i.prices.every((p) => p.source === "estimate")).toBe(true);
    }
  });
});
