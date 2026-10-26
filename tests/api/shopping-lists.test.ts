import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const { mealPlan, stockItem, shoppingList, shoppingListItem, exigerSession } = vi.hoisted(() => ({
  mealPlan: { findFirst: vi.fn() },
  stockItem: { findMany: vi.fn() },
  shoppingList: { deleteMany: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
  shoppingListItem: { updateMany: vi.fn() },
  exigerSession: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const prisma = {
    mealPlan,
    stockItem,
    shoppingList,
    shoppingListItem,
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
  };
  return { prisma };
});
// exigerEcriture renvoie la même session : son refus en lecture seule est testé dans garde.test.ts
const exigerEcriture = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/garde", () => ({ exigerSession, exigerEcriture }));

import { POST } from "@/app/api/meal-plans/[id]/shopping-list/route";
import { GET } from "@/app/api/shopping-lists/[id]/route";
import { PATCH } from "@/app/api/shopping-lists/[id]/items/[itemId]/route";

const MENU = "8f2b4c1e-3d5a-4e6f-9a7b-1c2d3e4f5a6b";
const LISTE = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const ARTICLE = "9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b";
const SESSION = { userId: "u1", role: "user", householdId: "f1" };

const contexte = (id = MENU) => ({ params: Promise.resolve({ id }) });
const contexteArticle = (id = LISTE, itemId = ARTICLE) => ({
  params: Promise.resolve({ id, itemId }),
});

const unite = (id: string, label: string, gramsEquivalent: number) => ({
  id,
  label,
  gramsEquivalent,
});
const tas = unite("u-tas", "tas", 500);
const boite = unite("u-boite", "boîte", 400);
const gramme = unite("u-g", "g", 1);

const releve = (priceFcfa: number, placeType: string) => ({
  priceFcfa,
  unit: tas,
  source: "team",
  observedAt: new Date("2026-10-20"),
  placeType,
});

// Aubergine : 1 kg pour 4, avec un relevé au marché à 500 FCFA le tas de 500 g.
// Concentré de tomate : sans aucun prix, catégorie conserve.
function menu() {
  return {
    id: MENU,
    householdId: "f1",
    meals: [
      {
        servings: 4,
        recipe: {
          servings: 4,
          ingredients: [
            {
              ingredientId: "i-aub",
              quantity: 1000,
              optional: false,
              unit: gramme,
              ingredient: {
                id: "i-aub",
                name: "Aubergine",
                category: "légume",
                defaultUnit: tas,
                units: [tas],
                prices: [releve(500, "market"), releve(700, "supermarket")],
              },
            },
            {
              ingredientId: "i-conc",
              quantity: 300,
              optional: false,
              unit: gramme,
              ingredient: {
                id: "i-conc",
                name: "Concentré de tomate",
                category: "conserve",
                defaultUnit: null,
                units: [boite],
                prices: [],
              },
            },
          ],
        },
      },
    ],
  };
}

type ArticleCree = {
  ingredientId: string;
  unitId: string;
  quantity: number;
  estimatedPriceFcfa: number | null;
  placeType: string;
};

// create renvoie ce qu'on lui a donné, sous la forme lue en base
function listeEnBase(data: {
  mealPlanId: string;
  estimatedTotalFcfa: number;
  items: { create: ArticleCree[] };
}) {
  return {
    id: LISTE,
    mealPlanId: data.mealPlanId,
    estimatedTotalFcfa: data.estimatedTotalFcfa,
    sharedAt: null,
    items: data.items.create.map((a, i) => ({
      ...a,
      id: `a${i}`,
      checked: false,
      ingredient: { name: a.ingredientId },
      unit: { label: a.unitId },
    })),
  };
}

function requete(methode: string, corps?: unknown) {
  return new Request("http://localhost/api", {
    method: methode,
    headers: { "Content-Type": "application/json" },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-26T08:00:00Z"));
  exigerSession.mockResolvedValue(SESSION);
  exigerEcriture.mockResolvedValue(SESSION);
  mealPlan.findFirst.mockResolvedValue(menu());
  stockItem.findMany.mockResolvedValue([]);
  shoppingList.create.mockImplementation(({ data }) => Promise.resolve(listeEnBase(data)));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("POST /api/meal-plans/:id/shopping-list", () => {
  it("refuse sans session (401)", async () => {
    exigerEcriture.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    const reponse = await POST(requete("POST"), contexte());
    expect(reponse.status).toBe(401);
  });

  it("refuse une personne invitée en lecture seule (403)", async () => {
    exigerEcriture.mockRejectedValue(new ErreurApi("LECTURESEULE"));
    const reponse = await POST(requete("POST"), contexte());
    expect(reponse.status).toBe(403);
    expect(shoppingList.create).not.toHaveBeenCalled();
  });

  it("traite un identifiant mal formé comme introuvable (404)", async () => {
    const reponse = await POST(requete("POST"), contexte("pas-un-uuid"));
    expect(reponse.status).toBe(404);
    expect(mealPlan.findFirst).not.toHaveBeenCalled();
  });

  it("ne trouve pas le menu d'un autre foyer (404)", async () => {
    mealPlan.findFirst.mockResolvedValue(null);
    const reponse = await POST(requete("POST"), contexte());
    expect(reponse.status).toBe(404);
    expect(mealPlan.findFirst.mock.calls[0][0].where).toEqual({ id: MENU, householdId: "f1" });
    expect(shoppingList.create).not.toHaveBeenCalled();
  });

  it("ne compte que les repas prévus qui ne sont pas des restes", async () => {
    await POST(requete("POST"), contexte());
    const { meals } = mealPlan.findFirst.mock.calls[0][0].include;
    expect(meals.where).toEqual({ status: "planned", leftoverFromId: null });
  });

  it("enregistre la liste en unités du marché avec un total entier en FCFA", async () => {
    const reponse = await POST(requete("POST"), contexte());
    expect(reponse.status).toBe(201);
    const { list } = await reponse.json();

    // 1 kg d'aubergine = 2 tas à 500 FCFA, au marché (relevé le moins cher)
    const aubergine = list.items.find((a: { ingredientId: string }) => a.ingredientId === "i-aub");
    expect(aubergine).toMatchObject({
      quantity: 2,
      unit: "u-tas",
      estimatedPriceFcfa: 1000,
      placeType: "market",
    });
    expect(list.estimatedTotalFcfa).toBe(1000);
    expect(Number.isInteger(list.estimatedTotalFcfa)).toBe(true);
  });

  it("garde un article sans prix hors du total, au supermarché s'il est emballé", async () => {
    const { list } = await (await POST(requete("POST"), contexte())).json();
    const concentre = list.items.find((a: { ingredientId: string }) => a.ingredientId === "i-conc");
    expect(concentre).toMatchObject({
      quantity: 1,
      unit: "u-boite",
      estimatedPriceFcfa: null,
      placeType: "supermarket",
    });
    expect(list.estimatedTotalFcfa).toBe(1000);
  });

  it("déduit le stock du foyer", async () => {
    // 600 g d'aubergine en stock : il reste 400 g, donc 1 tas
    stockItem.findMany.mockResolvedValue([
      { ingredientId: "i-aub", quantity: 600, unit: gramme },
    ]);
    const { list } = await (await POST(requete("POST"), contexte())).json();
    const aubergine = list.items.find((a: { ingredientId: string }) => a.ingredientId === "i-aub");
    expect(aubergine).toMatchObject({ quantity: 1, estimatedPriceFcfa: 500 });
    expect(stockItem.findMany.mock.calls[0][0].where).toEqual({
      householdId: "f1",
      status: { in: ["ok", "useSoon"] },
    });
  });

  it("remplace l'ancienne liste du menu", async () => {
    await POST(requete("POST"), contexte());
    expect(shoppingList.deleteMany).toHaveBeenCalledWith({
      where: { mealPlanId: MENU, householdId: "f1" },
    });
    expect(shoppingList.create.mock.calls[0][0].data.householdId).toBe("f1");
  });
});

const listeLue = {
  id: LISTE,
  mealPlanId: MENU,
  estimatedTotalFcfa: 1500,
  sharedAt: null,
  items: [
    {
      id: ARTICLE,
      ingredientId: "i-aub",
      ingredient: { name: "Aubergine" },
      quantity: 2,
      unit: { label: "tas" },
      estimatedPriceFcfa: 1000,
      placeType: "market",
      checked: true,
    },
    {
      id: "a2",
      ingredientId: "i-oignon",
      ingredient: { name: "Oignon" },
      quantity: 1,
      unit: { label: "tas" },
      estimatedPriceFcfa: 500,
      placeType: "market",
      checked: false,
    },
  ],
};

describe("GET /api/shopping-lists/:id", () => {
  it("refuse sans session (401)", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    expect((await GET(requete("GET"), contexte(LISTE))).status).toBe(401);
  });

  it("ne trouve pas la liste d'un autre foyer (404)", async () => {
    shoppingList.findFirst.mockResolvedValue(null);
    const reponse = await GET(requete("GET"), contexte(LISTE));
    expect(reponse.status).toBe(404);
    expect(shoppingList.findFirst.mock.calls[0][0].where).toEqual({ id: LISTE, householdId: "f1" });
  });

  it("renvoie la liste avec ce qu'il reste à dépenser", async () => {
    shoppingList.findFirst.mockResolvedValue(listeLue);
    const reponse = await GET(requete("GET"), contexte(LISTE));
    expect(reponse.status).toBe(200);
    const { list } = await reponse.json();
    expect(list.estimatedTotalFcfa).toBe(1500);
    expect(list.remainingFcfa).toBe(500);
    expect(list.items[0]).toMatchObject({ ingredient: "Aubergine", unit: "tas", checked: true });
  });
});

describe("PATCH /api/shopping-lists/:id/items/:itemId", () => {
  it("refuse une personne invitée en lecture seule (403)", async () => {
    exigerEcriture.mockRejectedValue(new ErreurApi("LECTURESEULE"));
    const reponse = await PATCH(requete("PATCH", { checked: true }), contexteArticle());
    expect(reponse.status).toBe(403);
    expect(shoppingListItem.updateMany).not.toHaveBeenCalled();
  });

  it("refuse un corps invalide (400)", async () => {
    const reponse = await PATCH(requete("PATCH", { checked: "oui" }), contexteArticle());
    expect(reponse.status).toBe(400);
  });

  it("traite un article mal formé comme introuvable (404)", async () => {
    const reponse = await PATCH(requete("PATCH", { checked: true }), contexteArticle(LISTE, "x"));
    expect(reponse.status).toBe(404);
  });

  it("ne coche pas l'article d'un autre foyer (404)", async () => {
    shoppingListItem.updateMany.mockResolvedValue({ count: 0 });
    const reponse = await PATCH(requete("PATCH", { checked: true }), contexteArticle());
    expect(reponse.status).toBe(404);
  });

  it("coche l'article et renvoie la liste à jour", async () => {
    shoppingListItem.updateMany.mockResolvedValue({ count: 1 });
    shoppingList.findFirst.mockResolvedValue(listeLue);
    const reponse = await PATCH(requete("PATCH", { checked: true }), contexteArticle());
    expect(reponse.status).toBe(200);
    expect(shoppingListItem.updateMany).toHaveBeenCalledWith({
      where: { id: ARTICLE, listId: LISTE, list: { householdId: "f1" } },
      data: { checked: true },
    });
    expect((await reponse.json()).list.remainingFcfa).toBe(500);
  });
});
