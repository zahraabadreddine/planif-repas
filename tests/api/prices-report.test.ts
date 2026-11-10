import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";
import { dateDuJour } from "@/lib/foyer/age";

const { prisma, exigerSession } = vi.hoisted(() => ({
  prisma: {
    marketUnit: { findUnique: vi.fn() },
    ingredient: { findUnique: vi.fn() },
    store: { findUnique: vi.fn() },
    price: { count: vi.fn(), create: vi.fn() },
  },
  exigerSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth/garde", () => ({ exigerSession }));

import { POST } from "@/app/api/prices/report/route";

const INGREDIENT = "8f2b4c1e-3d5a-4e6f-9a7b-1c2d3e4f5a6b";
const UNITE = "9a3c5d2f-4e6b-4f70-8b8c-2d3e4f5a6b7c";
const AUTRE = "1b2c3d4e-5f60-4718-9a2b-3c4d5e6f7a8b";

const corps = (modif: Record<string, unknown> = {}) => ({
  ingredientId: INGREDIENT,
  unitId: UNITE,
  priceFcfa: 700,
  placeType: "market",
  observedAt: dateDuJour(),
  ...modif,
});

const requete = (donnees: unknown) =>
  new Request("http://localhost/api/prices/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(donnees),
  });

const demain = () => {
  const date = new Date(`${dateDuJour()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

beforeEach(() => {
  vi.clearAllMocks();
  exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: "f1", acces: "edit" });
  prisma.ingredient.findUnique.mockResolvedValue({ id: INGREDIENT });
  prisma.marketUnit.findUnique.mockResolvedValue({ ingredientId: INGREDIENT });
  prisma.price.count.mockResolvedValue(0);
  prisma.price.create.mockResolvedValue({ id: "p1" });
});

describe("POST /api/prices/report", () => {
  it("refuse une requête sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    expect((await POST(requete(corps()))).status).toBe(401);
  });

  it("enregistre un prix observé par la famille, daté du jour sans heure", async () => {
    expect((await POST(requete(corps()))).status).toBe(201);
    expect(prisma.price.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: "user",
        reportedById: "u1",
        observedAt: new Date(`${dateDuJour()}T00:00:00Z`),
      }),
    });
  });

  it("refuse une date dans le futur : elle compterait toujours comme récente", async () => {
    const reponse = await POST(requete(corps({ observedAt: demain() })));
    expect(reponse.status).toBe(400);
    expect(prisma.price.create).not.toHaveBeenCalled();
  });

  it("refuse un deuxième relevé de la même personne, même article, même lieu, même jour", async () => {
    prisma.price.count.mockResolvedValue(1);
    const reponse = await POST(requete(corps()));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).error.code).toBe("PRIXDEJADECLARE");
    expect(prisma.price.create).not.toHaveBeenCalled();
  });

  it("répond introuvable pour un ingrédient inconnu ou une unité d'un autre ingrédient", async () => {
    prisma.ingredient.findUnique.mockResolvedValue(null);
    expect((await POST(requete(corps()))).status).toBe(404);
    prisma.ingredient.findUnique.mockResolvedValue({ id: INGREDIENT });
    prisma.marketUnit.findUnique.mockResolvedValue({ ingredientId: AUTRE });
    expect((await POST(requete(corps()))).status).toBe(404);
    expect(prisma.price.create).not.toHaveBeenCalled();
  });

  it("accepte une unité générique (kg, pièce)", async () => {
    prisma.marketUnit.findUnique.mockResolvedValue({ ingredientId: null });
    expect((await POST(requete(corps()))).status).toBe(201);
  });

  it("répond introuvable pour un magasin inconnu", async () => {
    prisma.store.findUnique.mockResolvedValue(null);
    expect((await POST(requete(corps({ storeId: AUTRE })))).status).toBe(404);
  });

  it("refuse un prix décimal, nul ou démesuré", async () => {
    for (const priceFcfa of [700.5, 0, 5_000_000]) {
      expect((await POST(requete(corps({ priceFcfa })))).status, String(priceFcfa)).toBe(400);
    }
  });
});
