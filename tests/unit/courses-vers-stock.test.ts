import { beforeEach, describe, expect, it, vi } from "vitest";

// Un article coché sur la liste de courses arrive dans le stock ; décoché, il en repart.

const mocks = vi.hoisted(() => ({
  itemFindFirst: vi.fn(),
  itemUpdateMany: vi.fn(),
  listFindFirst: vi.fn(),
  mouvementFindMany: vi.fn(),
  mouvementCreate: vi.fn(),
  stockUpdate: vi.fn(),
  declarerAchats: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const tx = {
    stockMovement: { findMany: mocks.mouvementFindMany, create: mocks.mouvementCreate },
    stockItem: { update: mocks.stockUpdate },
  };
  return {
    prisma: {
      shoppingListItem: { findFirst: mocks.itemFindFirst, updateMany: mocks.itemUpdateMany },
      shoppingList: { findFirst: mocks.listFindFirst },
      $transaction: (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    },
  };
});
vi.mock("@/lib/stock/achats", () => ({ declarerAchats: mocks.declarerAchats }));

import { cocherArticle } from "@/lib/courses/generation";
import {
  lieuDeRangement,
  quantiteARetirer,
  referenceArticle,
  retirerDepuisListe,
} from "@/lib/stock/achat-liste";
import type { SessionVerifiee } from "@/lib/auth/garde";

const SESSION: SessionVerifiee = {
  userId: "u1",
  role: "user",
  householdId: "h1",
  acces: "proprietaire",
};

const ARTICLE = {
  id: "item-1",
  listId: "liste-1",
  ingredientId: "ing-tomate",
  unitId: "unite-tas",
  quantity: 3,
  checked: false,
  ingredient: { shelfLifeDays: { ambiant: 3, frigo: 7 } },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.itemFindFirst.mockResolvedValue(ARTICLE);
  mocks.itemUpdateMany.mockResolvedValue({ count: 1 });
  mocks.listFindFirst.mockResolvedValue({
    id: "liste-1",
    mealPlanId: "menu-1",
    estimatedTotalFcfa: 0,
    sharedAt: null,
    items: [],
  });
  mocks.declarerAchats.mockResolvedValue([]);
  mocks.mouvementFindMany.mockResolvedValue([]);
});

describe("où ranger un article acheté", () => {
  it("au frigo s'il s'y garde plus longtemps", () => {
    expect(lieuDeRangement({ ambiant: 3, frigo: 7 })).toBe("fridge");
  });

  it("au placard s'il se garde aussi bien dehors, ou sans durée au frigo", () => {
    expect(lieuDeRangement({ ambiant: 30, frigo: 30 })).toBe("pantry");
    expect(lieuDeRangement({ ambiant: 365 })).toBe("pantry");
  });

  it("au frigo sans durée à l'air libre, au congélateur s'il ne se garde que là", () => {
    expect(lieuDeRangement({ frigo: 4 })).toBe("fridge");
    expect(lieuDeRangement({ congelateur: 90 })).toBe("freezer");
    expect(lieuDeRangement({})).toBe("pantry");
  });
});

describe("quantité à retirer quand on décoche", () => {
  it("retire ce que la coche a ajouté, jamais plus que ce qui reste", () => {
    expect(quantiteARetirer(3, 5)).toBe(3);
    expect(quantiteARetirer(3, 1.5)).toBe(1.5);
    expect(quantiteARetirer(0, 5)).toBe(0);
    expect(quantiteARetirer(3, 0)).toBe(0);
  });
});

describe("cocher un article", () => {
  it("ajoute l'article au stock, relié à l'article de la liste", async () => {
    await cocherArticle(SESSION, "liste-1", "item-1", true);
    expect(mocks.declarerAchats).toHaveBeenCalledWith(
      SESSION,
      [{ ingredientId: "ing-tomate", unitId: "unite-tas", quantity: 3, location: "fridge" }],
      "liste:item-1",
    );
  });

  it("un double clic n'ajoute rien une deuxième fois", async () => {
    mocks.itemUpdateMany.mockResolvedValueOnce({ count: 0 });
    await cocherArticle(SESSION, "liste-1", "item-1", true);
    expect(mocks.declarerAchats).not.toHaveBeenCalled();
  });

  it("ne change que l'article qui n'était pas déjà dans cet état", async () => {
    await cocherArticle(SESSION, "liste-1", "item-1", true);
    expect(mocks.itemUpdateMany).toHaveBeenCalledWith({
      where: { id: "item-1", listId: "liste-1", checked: false },
      data: { checked: true },
    });
  });

  it("un article d'un autre foyer est introuvable et le stock n'est pas touché", async () => {
    mocks.itemFindFirst.mockResolvedValueOnce(null);
    await expect(cocherArticle(SESSION, "liste-1", "item-1", true)).rejects.toThrow();
    expect(mocks.itemFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "item-1", listId: "liste-1", list: { householdId: "h1" } },
      }),
    );
    expect(mocks.itemUpdateMany).not.toHaveBeenCalled();
    expect(mocks.declarerAchats).not.toHaveBeenCalled();
  });

  it("si le stock échoue, la coche revient en arrière", async () => {
    mocks.declarerAchats.mockRejectedValueOnce(new Error("panne"));
    await expect(cocherArticle(SESSION, "liste-1", "item-1", true)).rejects.toThrow("panne");
    expect(mocks.itemUpdateMany).toHaveBeenLastCalledWith({
      where: { id: "item-1", listId: "liste-1", checked: true },
      data: { checked: false },
    });
  });

  it("décocher retire l'article du stock", async () => {
    await cocherArticle(SESSION, "liste-1", "item-1", false);
    expect(mocks.declarerAchats).not.toHaveBeenCalled();
    expect(mocks.mouvementFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { reference: referenceArticle("item-1"), stockItem: { householdId: "h1" } },
      }),
    );
  });
});

describe("décocher : correction qui annule l'achat", () => {
  const stockItem = (quantity: number) => ({
    id: "stock-1",
    quantity,
    status: "ok",
    unit: { gramsEquivalent: 500 },
  });

  it("crée une correction négative, sans rien supprimer", async () => {
    mocks.mouvementFindMany.mockResolvedValue([
      { stockItemId: "stock-1", quantity: 3, stockItem: stockItem(5) },
    ]);
    await retirerDepuisListe(SESSION, "item-1");
    expect(mocks.mouvementCreate).toHaveBeenCalledWith({
      data: {
        stockItemId: "stock-1",
        type: "correction",
        quantity: -3,
        grams: -1500,
        reference: "liste:item-1",
      },
    });
    expect(mocks.stockUpdate).toHaveBeenCalledWith({
      where: { id: "stock-1" },
      data: { quantity: 2, status: "ok" },
    });
  });

  it("ne passe jamais sous zéro si une partie a déjà été cuisinée", async () => {
    mocks.mouvementFindMany.mockResolvedValue([
      { stockItemId: "stock-1", quantity: 3, stockItem: stockItem(1) },
    ]);
    await retirerDepuisListe(SESSION, "item-1");
    expect(mocks.mouvementCreate.mock.calls[0][0].data.quantity).toBe(-1);
    expect(mocks.stockUpdate).toHaveBeenCalledWith({
      where: { id: "stock-1" },
      data: { quantity: 0, status: "used" },
    });
  });

  it("cocher, décocher puis recocher et redécocher : ne retire que l'achat en cours", async () => {
    mocks.mouvementFindMany.mockResolvedValue([
      { stockItemId: "stock-1", quantity: 3, stockItem: stockItem(3) },
      { stockItemId: "stock-1", quantity: -3, stockItem: stockItem(3) },
      { stockItemId: "stock-1", quantity: 3, stockItem: stockItem(3) },
    ]);
    await retirerDepuisListe(SESSION, "item-1");
    expect(mocks.mouvementCreate).toHaveBeenCalledTimes(1);
    expect(mocks.mouvementCreate.mock.calls[0][0].data.quantity).toBe(-3);
  });

  it("rien à retirer si l'achat est déjà annulé", async () => {
    mocks.mouvementFindMany.mockResolvedValue([
      { stockItemId: "stock-1", quantity: 3, stockItem: stockItem(3) },
      { stockItemId: "stock-1", quantity: -3, stockItem: stockItem(3) },
    ]);
    await retirerDepuisListe(SESSION, "item-1");
    expect(mocks.mouvementCreate).not.toHaveBeenCalled();
  });
});
