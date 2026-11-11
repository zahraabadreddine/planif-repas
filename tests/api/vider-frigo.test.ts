import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const HOUSEHOLDID = "hh-1111-1111-1111-111111111111";
const INGREDIENTTOMATE = "ing-tomate-0000-0000-000000000000";
const INGREDIENTOIGNON = "ing-oignon-0000-0000-000000000000";
const INGREDIENTARACHIDE = "ing-arachi-0000-0000-000000000000";
const RECIPE1 = "rec-11111-1111-1111-111111111111";
const RECIPE2 = "rec-22222-2222-2222-222222222222";
const RECIPEARACHIDE = "rec-arach-0000-0000-000000000000";

const { stockItem, householdMember, recipe, exigerSession } = vi.hoisted(() => ({
  stockItem: { findMany: vi.fn() },
  householdMember: { findMany: vi.fn() },
  recipe: { findMany: vi.fn() },
  exigerSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { stockItem, householdMember, recipe },
}));
vi.mock("@/lib/auth/garde", () => ({
  exigerSession,
  exigerEcriture: exigerSession,
}));

import { GET } from "@/app/api/stock/suggestions/route";
import { suggererRecettes } from "@/lib/stock/vider-frigo";

const session = {
  userId: "user-1",
  role: "user" as const,
  householdId: HOUSEHOLDID,
  acces: { canWrite: true } as never,
};

const membreSansRestriction = {
  id: "m1",
  label: "Papa",
  ageGroup: "adult",
  birthDate: null,
  restrictions: [],
};

const membreAllergieArachide = {
  id: "m2",
  label: "Enfant 1",
  ageGroup: "child",
  birthDate: null,
  restrictions: [{ type: "allergy", value: "arachide" }],
};

const unitTas = { gramsEquivalent: 300 };

function stockTomate(quantity: number, status = "ok") {
  return {
    ingredientId: INGREDIENTTOMATE,
    quantity,
    status,
    unit: unitTas,
  };
}

function stockOignon(quantity: number, status = "ok") {
  return {
    ingredientId: INGREDIENTOIGNON,
    quantity,
    status,
    unit: unitTas,
  };
}

function recetteSauce() {
  return {
    id: RECIPE1,
    title: "Sauce tomate",
    cuisine: "ivoirienne",
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 4,
    difficulty: 1,
    tags: [],
    validated: true,
    ingredients: [
      {
        ingredientId: INGREDIENTTOMATE,
        quantity: 2,
        optional: false,
        ingredient: { name: "Tomate", category: "légume", allergens: [] },
        unit: unitTas,
      },
      {
        ingredientId: INGREDIENTOIGNON,
        quantity: 1,
        optional: false,
        ingredient: { name: "Oignon", category: "légume", allergens: [] },
        unit: unitTas,
      },
    ],
  };
}

function recetteRapide() {
  return {
    id: RECIPE2,
    title: "Salade tomate",
    cuisine: "ivoirienne",
    prepMinutes: 5,
    cookMinutes: 0,
    servings: 4,
    difficulty: 1,
    tags: [],
    validated: true,
    ingredients: [
      {
        ingredientId: INGREDIENTTOMATE,
        quantity: 1,
        optional: false,
        ingredient: { name: "Tomate", category: "légume", allergens: [] },
        unit: unitTas,
      },
    ],
  };
}

function recetteArachide() {
  return {
    id: RECIPEARACHIDE,
    title: "Sauce arachide",
    cuisine: "ivoirienne",
    prepMinutes: 15,
    cookMinutes: 30,
    servings: 4,
    difficulty: 2,
    tags: [],
    validated: true,
    ingredients: [
      {
        ingredientId: INGREDIENTARACHIDE,
        quantity: 2,
        optional: false,
        ingredient: { name: "Pâte d'arachide", category: "oléagineux", allergens: ["arachide"] },
        unit: unitTas,
      },
      {
        ingredientId: INGREDIENTTOMATE,
        quantity: 1,
        optional: false,
        ingredient: { name: "Tomate", category: "légume", allergens: [] },
        unit: unitTas,
      },
    ],
  };
}

beforeEach(() => {
  for (const mock of [
    stockItem.findMany,
    householdMember.findMany,
    recipe.findMany,
    exigerSession,
  ]) {
    mock.mockReset();
  }
  exigerSession.mockResolvedValue(session);
  householdMember.findMany.mockResolvedValue([membreSansRestriction]);
});

// ─── suggererRecettes ────────────────────────────────────────────

describe("suggererRecettes", () => {
  it("renvoie les recettes faisables avec le stock", async () => {
    stockItem.findMany.mockResolvedValue([stockTomate(3), stockOignon(2)]);
    recipe.findMany.mockResolvedValue([recetteSauce()]);

    const resultat = await suggererRecettes(session);

    expect(resultat).toHaveLength(1);
    expect(resultat[0].title).toBe("Sauce tomate");
  });

  it("exclut une recette si un ingrédient requis manque dans le stock", async () => {
    stockItem.findMany.mockResolvedValue([stockTomate(3)]);
    recipe.findMany.mockResolvedValue([recetteSauce()]);

    const resultat = await suggererRecettes(session);

    expect(resultat).toHaveLength(0);
  });

  it("exclut une recette si la quantité en stock est insuffisante", async () => {
    stockItem.findMany.mockResolvedValue([stockTomate(0.5), stockOignon(2)]);
    recipe.findMany.mockResolvedValue([recetteSauce()]);
    householdMember.findMany.mockResolvedValue([
      membreSansRestriction,
      membreSansRestriction,
      membreSansRestriction,
      membreSansRestriction,
    ]);

    const resultat = await suggererRecettes(session);

    expect(resultat).toHaveLength(0);
  });

  it("un foyer allergique à l'arachide ne reçoit jamais de recette avec de l'arachide", async () => {
    stockItem.findMany.mockResolvedValue([
      stockTomate(5),
      stockOignon(3),
      { ingredientId: INGREDIENTARACHIDE, quantity: 5, status: "ok", unit: unitTas },
    ]);
    recipe.findMany.mockResolvedValue([recetteSauce(), recetteArachide()]);
    householdMember.findMany.mockResolvedValue([membreSansRestriction, membreAllergieArachide]);

    const resultat = await suggererRecettes(session);

    expect(resultat).toHaveLength(1);
    expect(resultat[0].title).toBe("Sauce tomate");
    expect(resultat.find((r) => r.title === "Sauce arachide")).toBeUndefined();
  });

  it("les recettes utilisant des produits bientôt périmés passent en premier", async () => {
    stockItem.findMany.mockResolvedValue([stockTomate(5, "useSoon"), stockOignon(3)]);
    recipe.findMany.mockResolvedValue([recetteRapide(), recetteSauce()]);

    const resultat = await suggererRecettes(session);

    expect(resultat.length).toBeGreaterThanOrEqual(1);
    expect(resultat[0].utiliseUseSoon).toBe(true);
  });

  it("trie par temps de préparation total quand pas de péremption", async () => {
    stockItem.findMany.mockResolvedValue([stockTomate(5), stockOignon(3)]);
    recipe.findMany.mockResolvedValue([recetteSauce(), recetteRapide()]);

    const resultat = await suggererRecettes(session);

    expect(resultat).toHaveLength(2);
    expect(resultat[0].title).toBe("Salade tomate");
    expect(resultat[1].title).toBe("Sauce tomate");
  });

  it("renvoie un tableau vide si le stock est vide", async () => {
    stockItem.findMany.mockResolvedValue([]);
    recipe.findMany.mockResolvedValue([recetteSauce()]);

    const resultat = await suggererRecettes(session);

    expect(resultat).toEqual([]);
  });

  it("lève FOYERMANQUANT sans foyer", async () => {
    const sessionSansFoyer = { ...session, householdId: null };

    await expect(suggererRecettes(sessionSansFoyer as never)).rejects.toThrow(ErreurApi);
  });

  it("ignore les ingrédients optionnels pour la faisabilité", async () => {
    const recetteAvecOptionnel = {
      ...recetteRapide(),
      ingredients: [
        ...recetteRapide().ingredients,
        {
          ingredientId: INGREDIENTOIGNON,
          quantity: 1,
          optional: true,
          ingredient: { name: "Oignon", category: "légume", allergens: [] },
          unit: unitTas,
        },
      ],
    };
    stockItem.findMany.mockResolvedValue([stockTomate(3)]);
    recipe.findMany.mockResolvedValue([recetteAvecOptionnel]);

    const resultat = await suggererRecettes(session);

    expect(resultat).toHaveLength(1);
  });

  it("adapte les quantités au nombre de membres du foyer", async () => {
    householdMember.findMany.mockResolvedValue([
      membreSansRestriction,
      membreSansRestriction,
      membreSansRestriction,
      membreSansRestriction,
      membreSansRestriction,
      membreSansRestriction,
      membreSansRestriction,
      membreSansRestriction,
    ]);
    stockItem.findMany.mockResolvedValue([stockTomate(1), stockOignon(1)]);
    recipe.findMany.mockResolvedValue([recetteSauce()]);

    const resultat = await suggererRecettes(session);

    expect(resultat).toHaveLength(0);
  });
});

// ─── GET /api/stock/suggestions ──────────────────────────────────

describe("GET /api/stock/suggestions", () => {
  it("renvoie les recettes complètes, celles pour moins de personnes et la taille du foyer", async () => {
    stockItem.findMany.mockResolvedValue([stockTomate(3), stockOignon(2)]);
    recipe.findMany.mockResolvedValue([recetteSauce()]);

    const reponse = await GET();
    const corps = await reponse.json();

    expect(reponse.status).toBe(200);
    expect(corps.completes).toHaveLength(1);
    expect(corps.completes[0].title).toBe("Sauce tomate");
    expect(corps.pourMoins).toEqual([]);
    expect(typeof corps.personnesFoyer).toBe("number");
  });

  it("avec un petit stock : pas de recette pour les 4, mais pour 2 personnes", async () => {
    householdMember.findMany.mockResolvedValue(
      ["a", "b", "c", "d"].map((id) => ({ ...membreSansRestriction, id })),
    );
    // La sauce pour 4 demande 2 tas de tomates (150 g par personne) : 1 tas suffit pour 2
    stockItem.findMany.mockResolvedValue([stockTomate(1), stockOignon(1)]);
    recipe.findMany.mockResolvedValue([recetteSauce()]);

    const corps = await (await GET()).json();

    expect(corps.completes).toEqual([]);
    expect(corps.pourMoins).toHaveLength(1);
    expect(corps.pourMoins[0]).toMatchObject({ title: "Sauce tomate", personnes: 2 });
    expect(corps.personnesFoyer).toBe(4);
  });

  it("401 sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));

    const reponse = await GET();
    expect(reponse.status).toBe(401);
  });

  it("409 sans foyer", async () => {
    exigerSession.mockResolvedValue({ ...session, householdId: null });
    stockItem.findMany.mockResolvedValue([]);
    recipe.findMany.mockResolvedValue([]);
    householdMember.findMany.mockResolvedValue([]);

    const reponse = await GET();
    expect(reponse.status).toBe(409);
  });
});
