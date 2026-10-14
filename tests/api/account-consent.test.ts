import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const { updateMany, exigerSession } = vi.hoisted(() => ({
  updateMany: vi.fn(),
  exigerSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { user: { updateMany } } }));
vi.mock("@/lib/auth/garde", () => ({ exigerSession }));

import { PUT } from "@/app/api/account/consent/route";

function requete(corps: unknown) {
  return new Request("http://localhost/api/account/consent", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
}

beforeEach(() => {
  updateMany.mockReset();
  exigerSession.mockReset();
  exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: "f1" });
});

describe("PUT /api/account/consent", () => {
  it("refuse une requête sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    expect((await PUT(requete({ health: true }))).status).toBe(401);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("n'accepte qu'un accord explicite", async () => {
    expect((await PUT(requete({ health: false }))).status).toBe(400);
    expect((await PUT(requete({}))).status).toBe(400);
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("enregistre la date du consentement de la session, sans écraser un accord déjà donné", async () => {
    const reponse = await PUT(requete({ health: true }));
    expect(reponse.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "u1", consentHealthAt: null },
      data: { consentHealthAt: expect.any(Date) },
    });
  });
});
