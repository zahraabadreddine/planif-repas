import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const UUID1 = "8f2b4c1e-3d5a-4e6f-9a7b-1c2d3e4f5a6b";
const UUID2 = "9a3c5d2f-4e6b-5f7a-8b9c-2d3e4f5a6b7c";
const UNITID = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";

const { stockItem, stockMovement, ingredient, marketUnit, $transaction, exigerSession } =
  vi.hoisted(() => ({
    stockItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    stockMovement: { create: vi.fn() },
    ingredient: { findMany: vi.fn() },
    marketUnit: { findMany: vi.fn() },
    $transaction: vi.fn(),
    exigerSession: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  prisma: { stockItem, stockMovement, ingredient, marketUnit, $transaction },
}));
vi.mock("@/lib/auth/garde", () => ({
  exigerSession,
  exigerEcriture: exigerSession,
}));

import { GET } from "@/app/api/stock/route";
import { POST } from "@/app/api/stock/purchases/route";

const requete = (corps: unknown) =>
  new Request("http://localhost/api/stock/purchases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });

const tomate = {
  id: UUID1,
  name: "Tomate",
  shelfLifeDays: { ambiant: 5, frigo: 10, congelateur: 90 },
};
const tas = { id: UNITID, label: "tas", gramsEquivalent: 300 };

const txClient = { stockItem, stockMovement, ingredient, marketUnit };

beforeEach(() => {
  for (const mock of [
    stockItem.findMany,
    stockItem.findFirst,
    stockItem.create,
    stockItem.update,
    stockItem.updateMany,
    stockMovement.create,
    ingredient.findMany,
    marketUnit.findMany,
    $transaction,
    exigerSession,
  ]) {
    mock.mockReset();
  }
  exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: "f1" });
  stockItem.updateMany.mockResolvedValue({ count: 0 });
  ingredient.findMany.mockResolvedValue([tomate]);
  marketUnit.findMany.mockResolvedValue([tas]);
  $transaction.mockImplementation((arg: unknown) => {
    if (typeof arg === "function") {
      return (arg as (tx: typeof txClient) => Promise<unknown>)(txClient);
    }
    return Promise.resolve(arg);
  });
});

// ─── GET /api/stock ───

describe("GET /api/stock", () => {
  it("refuse sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    expect((await GET()).status).toBe(401);
  });

  it("exige un foyer", async () => {
    exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: null });
    expect((await GET()).status).toBe(409);
  });

  it("renvoie la liste du stock, useSoon en premier", async () => {
    stockItem.findMany.mockResolvedValue([
      {
        id: UUID1,
        ingredientId: UUID1,
        unitId: UNITID,
        quantity: 3,
        location: "fridge",
        expiresAt: new Date("2026-11-03"),
        status: "useSoon",
        addedAt: new Date("2026-11-01"),
        ingredient: { name: "Tomate", category: "légume" },
        unit: { label: "tas" },
      },
    ]);

    const reponse = await GET();
    expect(reponse.status).toBe(200);
    const data = await reponse.json();
    expect(data).toHaveLength(1);
    expect(data[0].ingredientName).toBe("Tomate");
    expect(data[0].status).toBe("useSoon");
  });
});

// ─── POST /api/stock/purchases ───

describe("POST /api/stock/purchases", () => {
  it("refuse sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    const r = await POST(
      requete({
        items: [{ ingredientId: UUID1, unitId: UNITID, quantity: 2, location: "fridge" }],
      }),
    );
    expect(r.status).toBe(401);
  });

  it("refuse en lecture seule (403)", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("LECTURESEULE"));
    const r = await POST(
      requete({
        items: [{ ingredientId: UUID1, unitId: UNITID, quantity: 2, location: "fridge" }],
      }),
    );
    expect(r.status).toBe(403);
  });

  it("exige un foyer", async () => {
    exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: null });
    const r = await POST(
      requete({
        items: [{ ingredientId: UUID1, unitId: UNITID, quantity: 2, location: "fridge" }],
      }),
    );
    expect(r.status).toBe(409);
  });

  it("refuse un householdId glissé dans la requête (strictObject)", async () => {
    const r = await POST(
      requete({
        householdId: "pirate",
        items: [{ ingredientId: UUID1, unitId: UNITID, quantity: 2, location: "fridge" }],
      }),
    );
    expect(r.status).toBe(400);
  });

  it("refuse un tableau vide", async () => {
    const r = await POST(requete({ items: [] }));
    expect(r.status).toBe(400);
  });

  it("refuse une quantité négative", async () => {
    const r = await POST(
      requete({
        items: [{ ingredientId: UUID1, unitId: UNITID, quantity: -1, location: "fridge" }],
      }),
    );
    expect(r.status).toBe(400);
  });

  it("refuse un lieu invalide", async () => {
    const r = await POST(
      requete({
        items: [{ ingredientId: UUID1, unitId: UNITID, quantity: 2, location: "garage" }],
      }),
    );
    expect(r.status).toBe(400);
  });

  it("refuse un ingrédient inexistant", async () => {
    ingredient.findMany.mockResolvedValue([]);
    const r = await POST(
      requete({
        items: [{ ingredientId: UUID2, unitId: UNITID, quantity: 2, location: "fridge" }],
      }),
    );
    expect(r.status).toBe(404);
  });

  it("refuse une unité inexistante", async () => {
    marketUnit.findMany.mockResolvedValue([]);
    const r = await POST(
      requete({
        items: [{ ingredientId: UUID1, unitId: UNITID, quantity: 2, location: "fridge" }],
      }),
    );
    expect(r.status).toBe(404);
  });

  it("refuse l'unité d'un autre ingrédient : pas de tomates « en bouteille » (400)", async () => {
    const bouteille = "b1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d";
    marketUnit.findMany.mockResolvedValue([
      { id: bouteille, label: "bouteille", gramsEquivalent: 1000, ingredientId: UUID2 },
    ]);
    const r = await POST(
      requete({
        items: [{ ingredientId: UUID1, unitId: bouteille, quantity: 1, location: "pantry" }],
      }),
    );
    expect(r.status).toBe(400);
    expect(stockMovement.create).not.toHaveBeenCalled();
  });

  it("accepte le kg, unité générale proposée pour tous les ingrédients", async () => {
    const kg = "c1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d";
    marketUnit.findMany.mockResolvedValue([
      { id: kg, label: "kg", gramsEquivalent: 1000, ingredientId: null },
    ]);
    stockItem.findFirst.mockResolvedValue(null);
    stockItem.create.mockResolvedValue({ id: UUID1 });
    const r = await POST(
      requete({ items: [{ ingredientId: UUID1, unitId: kg, quantity: 0.5, location: "fridge" }] }),
    );
    expect(r.status).toBe(201);
    expect(stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "purchase", quantity: 0.5, grams: 500 }),
    });
  });

  it("crée un nouveau StockItem et un mouvement purchase", async () => {
    stockItem.findFirst.mockResolvedValue(null);
    stockItem.create.mockResolvedValue({ id: UUID1 });

    const r = await POST(
      requete({
        items: [{ ingredientId: UUID1, unitId: UNITID, quantity: 2, location: "fridge" }],
      }),
    );
    expect(r.status).toBe(201);

    expect(stockItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        householdId: "f1",
        ingredientId: UUID1,
        unitId: UNITID,
        quantity: 2,
        location: "fridge",
      }),
    });
    expect(stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stockItemId: UUID1,
        type: "purchase",
        quantity: 2,
        grams: 600,
      }),
    });

    const data = await r.json();
    expect(data).toHaveLength(1);
    expect(data[0].ingredientName).toBe("Tomate");
    expect(data[0].unitLabel).toBe("tas");
  });

  it("cumule sur un StockItem existant via $transaction", async () => {
    stockItem.findFirst.mockResolvedValue({
      id: UUID1,
      quantity: 3,
      expiresAt: new Date("2026-11-10"),
    });
    $transaction.mockResolvedValue([{}, {}]);

    const r = await POST(
      requete({
        items: [{ ingredientId: UUID1, unitId: UNITID, quantity: 2, location: "fridge" }],
      }),
    );
    expect(r.status).toBe(201);

    expect($transaction).toHaveBeenCalled();
    const data = await r.json();
    expect(data[0].quantity).toBe(5);
  });
});
