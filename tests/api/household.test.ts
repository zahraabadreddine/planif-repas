import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const { household, user, exigerSession } = vi.hoisted(() => ({
  household: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
  user: { update: vi.fn() },
  exigerSession: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const prisma = {
    household,
    user,
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
  };
  return { prisma };
});
// exigerEcriture renvoie la même session : son refus en lecture seule est testé dans garde.test.ts
vi.mock("@/lib/auth/garde", () => ({ exigerSession, exigerEcriture: exigerSession }));

import { GET, PUT } from "@/app/api/household/route";

function requete(corps: unknown) {
  return new Request("http://localhost/api/household", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
}

const corpsValide = {
  name: "Famille Test",
  weeklyBudgetFcfa: 25000,
  cuisinesPreferred: ["ivoirienne"],
  shoppingDay: 6,
};

const ligne = (id: string) => ({ id, ...corpsValide });

beforeEach(() => {
  for (const fn of [...Object.values(household), user.update, exigerSession]) fn.mockReset();
  exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: null });
});

describe("GET /api/household", () => {
  it("refuse une requête sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    expect((await GET()).status).toBe(401);
  });

  it("renvoie null quand le foyer n'est pas encore décrit", async () => {
    const reponse = await GET();
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ household: null });
    expect(household.findUnique).not.toHaveBeenCalled();
  });

  it("ne lit que le foyer de la session", async () => {
    exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: "f1" });
    household.findUnique.mockResolvedValue(ligne("f1"));
    const reponse = await GET();
    expect((await reponse.json()).household.id).toBe("f1");
    expect(household.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "f1" } }),
    );
  });

  it("ne garde que les cuisines connues lues en base", async () => {
    exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: "f1" });
    household.findUnique.mockResolvedValue({
      ...ligne("f1"),
      cuisinesPreferred: ["ivoirienne", 3],
    });
    expect((await (await GET()).json()).household.cuisinesPreferred).toEqual(["ivoirienne"]);
  });
});

describe("PUT /api/household", () => {
  it("refuse une requête sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    expect((await PUT(requete(corpsValide))).status).toBe(401);
    expect(household.create).not.toHaveBeenCalled();
  });

  it("refuse une personne invitée en lecture seule (403), sans rien écrire", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("LECTURESEULE"));
    expect((await PUT(requete(corpsValide))).status).toBe(403);
    expect(household.update).not.toHaveBeenCalled();
    expect(household.create).not.toHaveBeenCalled();
  });

  it("refuse des données invalides avec le détail par champ", async () => {
    const reponse = await PUT(requete({ ...corpsValide, weeklyBudgetFcfa: 25 }));
    expect(reponse.status).toBe(400);
    expect((await reponse.json()).error.champs.weeklyBudgetFcfa).toBeDefined();
    expect(household.create).not.toHaveBeenCalled();
  });

  it("refuse un identifiant de foyer glissé dans la requête", async () => {
    const reponse = await PUT(requete({ ...corpsValide, householdId: "foyer-de-b" }));
    expect(reponse.status).toBe(400);
    expect(household.update).not.toHaveBeenCalled();
  });

  it("crée le foyer et le relie au compte (201)", async () => {
    household.findUnique.mockResolvedValue(null);
    household.create.mockResolvedValue(ligne("f1"));
    const reponse = await PUT(requete(corpsValide));
    expect(reponse.status).toBe(201);
    expect(household.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ...corpsValide, ownerId: "u1" } }),
    );
    expect(user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { householdId: "f1", householdAccess: null },
    });
  });

  it("modifie le foyer de la session sans en créer un autre (200)", async () => {
    exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: "f1" });
    household.update.mockResolvedValue({ ...ligne("f1"), weeklyBudgetFcfa: 30000 });
    const reponse = await PUT(requete({ ...corpsValide, weeklyBudgetFcfa: 30000 }));
    expect(reponse.status).toBe(200);
    expect(household.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "f1" } }));
    expect(household.create).not.toHaveBeenCalled();
  });

  it("ne touche qu'aux champs du formulaire (membres, équipement et quartier préservés)", async () => {
    exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: "f1" });
    household.update.mockResolvedValue(ligne("f1"));
    await PUT(requete(corpsValide));
    expect(Object.keys(household.update.mock.calls[0][0].data).sort()).toEqual(
      ["cuisinesPreferred", "name", "shoppingDay", "weeklyBudgetFcfa"].sort(),
    );
  });

  it("empêche un compte A de modifier le foyer d'un compte B", async () => {
    // A (u1, foyer f1) ne peut viser que son propre foyer : l'identifiant vient de sa session.
    exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: "f1" });
    household.update.mockResolvedValue(ligne("f1"));
    await PUT(requete(corpsValide));
    expect(household.update).toHaveBeenCalledTimes(1);
    expect(household.update.mock.calls[0][0].where).toEqual({ id: "f1" });
  });

  it("reprend le foyer existant d'un compte au lieu d'en créer un second", async () => {
    household.findUnique.mockResolvedValue({ id: "f1" });
    household.update.mockResolvedValue(ligne("f1"));
    const reponse = await PUT(requete(corpsValide));
    expect(reponse.status).toBe(200);
    expect(household.create).not.toHaveBeenCalled();
    expect(user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { householdId: "f1", householdAccess: null },
    });
  });
});
