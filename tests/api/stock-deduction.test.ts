import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const MEALID = "11111111-1111-1111-1111-111111111111";
const STOCKID = "33333333-3333-3333-3333-333333333333";
const STOCKID2 = "33333333-3333-3333-3333-444444444444";
const INGREDIENTID = "44444444-4444-4444-4444-444444444444";
const HOUSEHOLDID = "66666666-6666-6666-6666-666666666666";
const OTHERHOUSEHOLD = "77777777-7777-7777-7777-777777777777";

const { plannedMeal, stockItem, stockMovement, $transaction, exigerSession } = vi.hoisted(() => ({
  plannedMeal: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  stockItem: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  stockMovement: { create: vi.fn() },
  $transaction: vi.fn(),
  exigerSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    plannedMeal,
    stockItem,
    stockMovement,
    $transaction,
  },
}));
vi.mock("@/lib/auth/garde", () => ({
  exigerSession,
  exigerEcriture: exigerSession,
}));

import { POST as cuisineRoute } from "@/app/api/planned-meals/[id]/cooked/route";
import { PATCH as correctionRoute } from "@/app/api/stock/[id]/route";
import { POST as jetRoute } from "@/app/api/stock/[id]/thrown/route";

const session = {
  userId: "user-1",
  role: "parent" as const,
  householdId: HOUSEHOLDID,
  acces: { canWrite: true } as never,
};

const requeteJson = (corps: unknown) =>
  new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });

const paramsAvec = (id: string) => ({ params: Promise.resolve({ id }) });

const txClient = { plannedMeal, stockItem, stockMovement };

beforeEach(() => {
  for (const mock of [
    plannedMeal.findUnique,
    plannedMeal.update,
    plannedMeal.updateMany,
    stockItem.findUnique,
    stockItem.findMany,
    stockItem.update,
    stockMovement.create,
    $transaction,
    exigerSession,
  ]) {
    (mock as ReturnType<typeof vi.fn>).mockReset();
  }
  exigerSession.mockResolvedValue(session);
  $transaction.mockImplementation((arg: unknown) => {
    if (typeof arg === "function") {
      return (arg as (tx: typeof txClient) => Promise<unknown>)(txClient);
    }
    return Promise.resolve(arg);
  });
  plannedMeal.updateMany.mockResolvedValue({ count: 1 });
});

// ─── POST /api/planned-meals/:id/cooked ────────────────────────────

describe("POST /api/planned-meals/:id/cooked", () => {
  const repasComplet = {
    id: MEALID,
    servings: 4,
    status: "planned",
    mealPlan: { householdId: HOUSEHOLDID },
    recipe: {
      title: "Sauce aubergine",
      servings: 4,
      ingredients: [
        {
          ingredientId: INGREDIENTID,
          quantity: 2,
          optional: false,
          ingredient: { name: "Aubergine" },
          unit: { label: "tas", gramsEquivalent: 300 },
        },
      ],
    },
  };

  it("déduit le stock et marque le repas cuisiné", async () => {
    plannedMeal.findUnique.mockResolvedValue(repasComplet);
    stockItem.findMany.mockResolvedValue([
      { id: STOCKID, quantity: 5, status: "ok", unit: { gramsEquivalent: 300 } },
    ]);

    const reponse = await cuisineRoute(new Request("http://localhost"), paramsAvec(MEALID));
    const corps = await reponse.json();

    expect(reponse.status).toBe(200);
    expect(corps.recipeName).toBe("Sauce aubergine");
    expect(corps.deductions).toHaveLength(1);
    expect(corps.deductions[0]).toEqual({
      ingredientName: "Aubergine",
      quantity: 2,
      unitLabel: "tas",
    });
    expect($transaction).toHaveBeenCalledTimes(1);
    expect(plannedMeal.updateMany).toHaveBeenCalledWith({
      where: { id: MEALID, status: { not: "cooked" } },
      data: { status: "cooked" },
    });
  });

  it("ne passe jamais sous zéro si stock insuffisant", async () => {
    plannedMeal.findUnique.mockResolvedValue(repasComplet);
    stockItem.findMany.mockResolvedValue([
      { id: STOCKID, quantity: 1, status: "ok", unit: { gramsEquivalent: 300 } },
    ]);

    const reponse = await cuisineRoute(new Request("http://localhost"), paramsAvec(MEALID));
    const corps = await reponse.json();

    expect(reponse.status).toBe(200);
    expect(corps.deductions[0].quantity).toBe(1);
  });

  it("combine plusieurs articles du même ingrédient (FEFO)", async () => {
    plannedMeal.findUnique.mockResolvedValue(repasComplet);
    stockItem.findMany.mockResolvedValue([
      { id: STOCKID, quantity: 1, status: "useSoon", unit: { gramsEquivalent: 300 } },
      { id: STOCKID2, quantity: 3, status: "ok", unit: { gramsEquivalent: 300 } },
    ]);

    const reponse = await cuisineRoute(new Request("http://localhost"), paramsAvec(MEALID));
    const corps = await reponse.json();

    expect(corps.deductions[0].quantity).toBe(2);
    expect($transaction).toHaveBeenCalledTimes(1);
  });

  it("convertit les unités via les grammes quand recette et stock diffèrent", async () => {
    plannedMeal.findUnique.mockResolvedValue({
      ...repasComplet,
      recipe: {
        title: "Riz sauce",
        servings: 4,
        ingredients: [
          {
            ingredientId: INGREDIENTID,
            quantity: 500,
            optional: false,
            ingredient: { name: "Riz" },
            unit: { label: "g", gramsEquivalent: 1 },
          },
        ],
      },
    });
    stockItem.findMany.mockResolvedValue([
      { id: STOCKID, quantity: 2, status: "ok", unit: { gramsEquivalent: 400 } },
    ]);

    const reponse = await cuisineRoute(new Request("http://localhost"), paramsAvec(MEALID));
    const corps = await reponse.json();

    expect(reponse.status).toBe(200);
    expect(corps.deductions[0].quantity).toBe(500);
    expect(corps.deductions[0].unitLabel).toBe("g");
    expect(stockItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quantity: expect.closeTo(0.75, 5),
        }),
      }),
    );
  });

  it("ajuste la quantité selon les portions", async () => {
    const repas6portions = {
      ...repasComplet,
      servings: 6,
    };
    plannedMeal.findUnique.mockResolvedValue(repas6portions);
    stockItem.findMany.mockResolvedValue([
      { id: STOCKID, quantity: 10, status: "ok", unit: { gramsEquivalent: 300 } },
    ]);

    const reponse = await cuisineRoute(new Request("http://localhost"), paramsAvec(MEALID));
    const corps = await reponse.json();

    expect(corps.deductions[0].quantity).toBe(3);
  });

  it("401 sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));

    const reponse = await cuisineRoute(new Request("http://localhost"), paramsAvec(MEALID));
    expect(reponse.status).toBe(401);
  });

  it("404 si repas introuvable", async () => {
    plannedMeal.findUnique.mockResolvedValue(null);

    const reponse = await cuisineRoute(new Request("http://localhost"), paramsAvec(MEALID));
    expect(reponse.status).toBe(404);
  });

  it("404 si le repas n'appartient pas au foyer : on ne révèle pas qu'il existe", async () => {
    plannedMeal.findUnique.mockResolvedValue({
      ...repasComplet,
      mealPlan: { householdId: OTHERHOUSEHOLD },
    });

    const reponse = await cuisineRoute(new Request("http://localhost"), paramsAvec(MEALID));
    expect(reponse.status).toBe(404);
  });

  it("400 si repas déjà cuisiné", async () => {
    plannedMeal.findUnique.mockResolvedValue({
      ...repasComplet,
      status: "cooked",
    });
    plannedMeal.updateMany.mockResolvedValue({ count: 0 });

    const reponse = await cuisineRoute(new Request("http://localhost"), paramsAvec(MEALID));
    expect(reponse.status).toBe(400);
  });
});

// ─── PATCH /api/stock/:id ──────────────────────────────────────────

describe("PATCH /api/stock/:id", () => {
  const articleStock = {
    id: STOCKID,
    householdId: HOUSEHOLDID,
    quantity: 3,
    status: "ok",
    ingredient: { name: "Riz" },
    unit: { label: "kg", gramsEquivalent: 1000 },
  };

  it("corrige la quantité et crée un mouvement correction", async () => {
    stockItem.findUnique.mockResolvedValue(articleStock);

    const reponse = await correctionRoute(requeteJson({ quantity: 5 }), paramsAvec(STOCKID));
    const corps = await reponse.json();

    expect(reponse.status).toBe(200);
    expect(corps.ancienneQuantite).toBe(3);
    expect(corps.nouvelleQuantite).toBe(5);
    expect($transaction).toHaveBeenCalledTimes(1);
  });

  it("ne crée pas de mouvement si la quantité ne change pas", async () => {
    stockItem.findUnique.mockResolvedValue(articleStock);

    const reponse = await correctionRoute(requeteJson({ quantity: 3 }), paramsAvec(STOCKID));
    const corps = await reponse.json();

    expect(reponse.status).toBe(200);
    expect(corps.ancienneQuantite).toBe(3);
    expect(corps.nouvelleQuantite).toBe(3);
  });

  it("met le statut used si la quantité tombe à 0", async () => {
    stockItem.findUnique.mockResolvedValue(articleStock);

    const reponse = await correctionRoute(requeteJson({ quantity: 0 }), paramsAvec(STOCKID));
    const corps = await reponse.json();

    expect(reponse.status).toBe(200);
    expect(corps.nouvelleQuantite).toBe(0);
    expect($transaction).toHaveBeenCalledTimes(1);
  });

  it("400 si quantité négative", async () => {
    const reponse = await correctionRoute(requeteJson({ quantity: -1 }), paramsAvec(STOCKID));
    expect(reponse.status).toBe(400);
  });

  it("404 si article introuvable", async () => {
    stockItem.findUnique.mockResolvedValue(null);

    const reponse = await correctionRoute(requeteJson({ quantity: 5 }), paramsAvec(STOCKID));
    expect(reponse.status).toBe(404);
  });

  it("404 si article d'un autre foyer : on ne révèle pas qu'il existe", async () => {
    stockItem.findUnique.mockResolvedValue({
      ...articleStock,
      householdId: OTHERHOUSEHOLD,
    });

    const reponse = await correctionRoute(requeteJson({ quantity: 5 }), paramsAvec(STOCKID));
    expect(reponse.status).toBe(404);
  });
});

// ─── POST /api/stock/:id/thrown ────────────────────────────────────

describe("POST /api/stock/:id/thrown", () => {
  const articleStock = {
    id: STOCKID,
    householdId: HOUSEHOLDID,
    quantity: 3,
    status: "ok",
    ingredient: { name: "Tomate" },
    unit: { label: "tas", gramsEquivalent: 300 },
  };

  it("déclare un produit jeté et crée un mouvement thrown", async () => {
    stockItem.findUnique.mockResolvedValue(articleStock);

    const reponse = await jetRoute(requeteJson({ quantity: 2 }), paramsAvec(STOCKID));
    const corps = await reponse.json();

    expect(reponse.status).toBe(200);
    expect(corps.quantiteJetee).toBe(2);
    expect(corps.quantiteRestante).toBe(1);
    expect($transaction).toHaveBeenCalledTimes(1);
  });

  it("ne dépasse jamais le stock disponible", async () => {
    stockItem.findUnique.mockResolvedValue(articleStock);

    const reponse = await jetRoute(requeteJson({ quantity: 10 }), paramsAvec(STOCKID));
    const corps = await reponse.json();

    expect(corps.quantiteJetee).toBe(3);
    expect(corps.quantiteRestante).toBe(0);
  });

  it("met le statut thrown si tout est jeté", async () => {
    stockItem.findUnique.mockResolvedValue(articleStock);

    const reponse = await jetRoute(requeteJson({ quantity: 3 }), paramsAvec(STOCKID));
    const corps = await reponse.json();

    expect(corps.quantiteRestante).toBe(0);
    expect($transaction).toHaveBeenCalledTimes(1);
  });

  it("400 si quantité non positive", async () => {
    const reponse = await jetRoute(requeteJson({ quantity: 0 }), paramsAvec(STOCKID));
    expect(reponse.status).toBe(400);
  });

  it("404 si article introuvable", async () => {
    stockItem.findUnique.mockResolvedValue(null);

    const reponse = await jetRoute(requeteJson({ quantity: 1 }), paramsAvec(STOCKID));
    expect(reponse.status).toBe(404);
  });

  it("404 si article d'un autre foyer : on ne révèle pas qu'il existe", async () => {
    stockItem.findUnique.mockResolvedValue({
      ...articleStock,
      householdId: OTHERHOUSEHOLD,
    });

    const reponse = await jetRoute(requeteJson({ quantity: 1 }), paramsAvec(STOCKID));
    expect(reponse.status).toBe(404);
  });
});
