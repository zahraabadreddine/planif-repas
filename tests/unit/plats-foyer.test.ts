import { beforeEach, describe, expect, it, vi } from "vitest";

// Plats du foyer : une idée d'Umi gardée par la famille avec les quantités qu'elle a validées.

const mocks = vi.hoisted(() => ({
  ingredientFindMany: vi.fn(),
  uniteFindFirst: vi.fn(),
  recipeCreate: vi.fn(),
  listerMembres: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    ingredient: { findMany: mocks.ingredientFindMany },
    marketUnit: { findFirst: mocks.uniteFindFirst },
    recipe: { create: mocks.recipeCreate },
  },
}));
vi.mock("@/lib/foyer/membres", () => ({ listerMembres: mocks.listerMembres }));

import {
  enregistrerPlatDuFoyer,
  grammesProposes,
  recettesVisibles,
} from "@/lib/catalogue/plats-foyer";
import { platFoyerSchema } from "@/lib/validation/plat-foyer";
import type { SessionVerifiee } from "@/lib/auth/garde";

const SESSION: SessionVerifiee = {
  userId: "u1",
  role: "user",
  householdId: "h1",
  acces: "proprietaire",
};
const AUBERGINE = "11111111-1111-4111-8111-111111111111";
const TAHINE = "22222222-2222-4222-8222-222222222222";

const membre = (allergies: string[]) => ({
  id: "m1",
  label: "Zoé",
  ageGroup: "child",
  birthDate: null,
  age: null,
  allergies,
  autresAllergies: [],
  regimes: [],
});

const plat = {
  titre: "Moutabal",
  categorie: "entrée" as const,
  personnes: 20,
  etapes: ["Griller les aubergines."],
  ingredients: [
    { ingredientId: AUBERGINE, grammes: 2000 },
    { ingredientId: TAHINE, grammes: 160 },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ingredientFindMany.mockResolvedValue([
    { id: AUBERGINE, name: "Aubergine", category: "légume", allergens: [] },
    { id: TAHINE, name: "Tahiné", category: "épicerie", allergens: ["sesame"] },
  ]);
  mocks.uniteFindFirst.mockResolvedValue({ id: "unite-g" });
  mocks.recipeCreate.mockResolvedValue({ id: "r1", title: "Moutabal" });
  mocks.listerMembres.mockResolvedValue([membre([])]);
});

describe("quantités proposées par le code", () => {
  it("selon la catégorie et le nombre de personnes, arrondies", () => {
    expect(grammesProposes("viande", 20)).toBe(3000);
    expect(grammesProposes("Légume", 4)).toBe(400);
    expect(grammesProposes("féculent", 3)).toBe(240);
    expect(grammesProposes("épice", 20)).toBe(20);
    expect(grammesProposes("huile", 1)).toBe(8);
  });

  it("une catégorie inconnue reçoit une portion moyenne", () => {
    expect(grammesProposes("inconnue", 2)).toBe(100);
  });
});

describe("garder un plat pour le foyer", () => {
  it("l'enregistre pour ce foyer seulement, jamais dans le catalogue de l'équipe", async () => {
    await enregistrerPlatDuFoyer(SESSION, plat);
    const { data } = mocks.recipeCreate.mock.calls[0][0];
    expect(data).toMatchObject({
      title: "Moutabal",
      householdId: "h1",
      validated: false,
      source: "ai",
      servings: 20,
      tags: ["plat-du-foyer", "entrée"],
    });
    expect(data.ingredients.create).toEqual([
      { ingredientId: AUBERGINE, unitId: "unite-g", quantity: 2000 },
      { ingredientId: TAHINE, unitId: "unite-g", quantity: 160 },
    ]);
  });

  it("revérifie les allergies avant d'enregistrer, même si l'idée était acceptée", async () => {
    mocks.listerMembres.mockResolvedValue([membre(["sesame"])]);
    await expect(enregistrerPlatDuFoyer(SESSION, plat)).rejects.toThrow("éviter");
    expect(mocks.recipeCreate).not.toHaveBeenCalled();
  });

  it("refuse un ingrédient qui n'existe pas", async () => {
    mocks.ingredientFindMany.mockResolvedValue([
      { id: AUBERGINE, name: "Aubergine", category: "légume", allergens: [] },
    ]);
    await expect(enregistrerPlatDuFoyer(SESSION, plat)).rejects.toThrow("catalogue");
    expect(mocks.recipeCreate).not.toHaveBeenCalled();
  });

  it("additionne un ingrédient cité deux fois", async () => {
    mocks.ingredientFindMany.mockResolvedValue([
      { id: AUBERGINE, name: "Aubergine", category: "légume", allergens: [] },
    ]);
    await enregistrerPlatDuFoyer(SESSION, {
      ...plat,
      ingredients: [
        { ingredientId: AUBERGINE, grammes: 1000 },
        { ingredientId: AUBERGINE, grammes: 500 },
      ],
    });
    expect(mocks.recipeCreate.mock.calls[0][0].data.ingredients.create).toEqual([
      { ingredientId: AUBERGINE, unitId: "unite-g", quantity: 1500 },
    ]);
  });

  it("refuse sans foyer dans la session", async () => {
    await expect(enregistrerPlatDuFoyer({ ...SESSION, householdId: null }, plat)).rejects.toThrow();
  });
});

describe("ce que la famille envoie", () => {
  it("le foyer ne vient jamais du corps de la requête (règle 4)", () => {
    expect(platFoyerSchema.safeParse({ ...plat, householdId: "autre" }).success).toBe(false);
  });

  it("refuse une quantité nulle, une faute de frappe énorme ou trop de personnes", () => {
    const avec = (grammes: number) => ({
      ...plat,
      ingredients: [{ ingredientId: AUBERGINE, grammes }],
    });
    expect(platFoyerSchema.safeParse(avec(0)).success).toBe(false);
    expect(platFoyerSchema.safeParse(avec(500000)).success).toBe(false);
    expect(platFoyerSchema.safeParse({ ...plat, personnes: 51 }).success).toBe(false);
  });
});

describe("plats visibles d'un foyer", () => {
  it("le catalogue validé de l'équipe et ses propres plats, jamais ceux d'un autre foyer", () => {
    expect(recettesVisibles("h1")).toEqual({
      OR: [{ validated: true, householdId: null }, { householdId: "h1" }],
    });
  });
});
