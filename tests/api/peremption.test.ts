import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const HOUSEHOLDID = "66666666-6666-6666-6666-666666666666";
const STOCKID1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const STOCKID2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const { stockItem, exigerSession } = vi.hoisted(() => ({
  stockItem: { updateMany: vi.fn(), findMany: vi.fn() },
  exigerSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: { stockItem },
}));
vi.mock("@/lib/auth/garde", () => ({
  exigerSession,
  exigerEcriture: exigerSession,
}));

import { GET as alertesRoute } from "@/app/api/stock/alertes/route";
import { rafraichirPeremption } from "@/lib/stock/peremption";

const session = {
  userId: "user-1",
  role: "user" as const,
  householdId: HOUSEHOLDID,
  acces: { canWrite: true } as never,
};

function dansJours(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(12, 0, 0, 0);
  return d;
}

beforeEach(() => {
  stockItem.updateMany.mockReset();
  stockItem.findMany.mockReset();
  exigerSession.mockReset();
  exigerSession.mockResolvedValue(session);
});

// ─── rafraichirPeremption ─────────────────────────────────────────

describe("rafraichirPeremption", () => {
  it("passe les articles à moins de 2 jours en useSoon", async () => {
    stockItem.updateMany.mockResolvedValue({ count: 2 });
    stockItem.findMany.mockResolvedValue([
      {
        id: STOCKID1,
        expiresAt: dansJours(1),
        quantity: 3,
        ingredient: { name: "Tomate" },
        unit: { label: "tas" },
      },
      {
        id: STOCKID2,
        expiresAt: dansJours(0),
        quantity: 1,
        ingredient: { name: "Aubergine" },
        unit: { label: "pièce" },
      },
    ]);

    const resultat = await rafraichirPeremption(session);

    expect(resultat.misAJour).toBe(2);
    expect(resultat.alertes).toHaveLength(2);
    expect(resultat.alertes[0].ingredientName).toBe("Tomate");
    expect(resultat.alertes[0].joursRestants).toBeGreaterThanOrEqual(0);
    expect(resultat.alertes[1].ingredientName).toBe("Aubergine");
  });

  it("appelle updateMany avec le bon filtre", async () => {
    stockItem.updateMany.mockResolvedValue({ count: 0 });
    stockItem.findMany.mockResolvedValue([]);

    await rafraichirPeremption(session);

    expect(stockItem.updateMany).toHaveBeenCalledTimes(1);
    const appel = stockItem.updateMany.mock.calls[0][0];
    expect(appel.where.householdId).toBe(HOUSEHOLDID);
    expect(appel.where.status).toBe("ok");
    expect(appel.where.quantity).toEqual({ gt: 0 });
    expect(appel.where.expiresAt.not).toBeNull();
    expect(appel.data.status).toBe("useSoon");
  });

  it("renvoie un tableau vide si aucun article proche de péremption", async () => {
    stockItem.updateMany.mockResolvedValue({ count: 0 });
    stockItem.findMany.mockResolvedValue([]);

    const resultat = await rafraichirPeremption(session);

    expect(resultat.misAJour).toBe(0);
    expect(resultat.alertes).toEqual([]);
  });

  it("lève FOYERMANQUANT sans foyer", async () => {
    const sessionSansFoyer = { ...session, householdId: null };

    await expect(rafraichirPeremption(sessionSansFoyer as never)).rejects.toThrow(ErreurApi);
  });

  it("calcule joursRestants = 0 pour un article qui expire aujourd'hui", async () => {
    const expireAujourdhui = new Date();
    expireAujourdhui.setHours(0, 0, 0, 0);
    stockItem.updateMany.mockResolvedValue({ count: 1 });
    stockItem.findMany.mockResolvedValue([
      {
        id: STOCKID1,
        expiresAt: expireAujourdhui,
        quantity: 2,
        ingredient: { name: "Lait" },
        unit: { label: "litre" },
      },
    ]);

    const resultat = await rafraichirPeremption(session);

    expect(resultat.alertes[0].joursRestants).toBe(0);
  });

  it("exclut les articles sans date de péremption des alertes", async () => {
    stockItem.updateMany.mockResolvedValue({ count: 0 });
    stockItem.findMany.mockResolvedValue([
      {
        id: STOCKID1,
        expiresAt: null,
        quantity: 2,
        ingredient: { name: "Sel" },
        unit: { label: "kg" },
      },
    ]);

    const resultat = await rafraichirPeremption(session);

    expect(resultat.alertes).toHaveLength(0);
  });
});

// ─── GET /api/stock/alertes ───────────────────────────────────────

describe("GET /api/stock/alertes", () => {
  it("renvoie les alertes en JSON", async () => {
    stockItem.updateMany.mockResolvedValue({ count: 1 });
    stockItem.findMany.mockResolvedValue([
      {
        id: STOCKID1,
        expiresAt: dansJours(1),
        quantity: 2,
        ingredient: { name: "Oignon" },
        unit: { label: "tas" },
      },
    ]);

    const reponse = await alertesRoute();
    const corps = await reponse.json();

    expect(reponse.status).toBe(200);
    expect(corps).toHaveLength(1);
    expect(corps[0].ingredientName).toBe("Oignon");
    expect(corps[0].joursRestants).toBeGreaterThanOrEqual(0);
  });

  it("401 sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));

    const reponse = await alertesRoute();
    expect(reponse.status).toBe(401);
  });

  it("renvoie un tableau vide si rien à signaler", async () => {
    stockItem.updateMany.mockResolvedValue({ count: 0 });
    stockItem.findMany.mockResolvedValue([]);

    const reponse = await alertesRoute();
    const corps = await reponse.json();

    expect(reponse.status).toBe(200);
    expect(corps).toEqual([]);
  });
});
