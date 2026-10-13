import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const { findUnique, update, exigerSession, verifierMotDePasse } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  exigerSession: vi.fn(),
  verifierMotDePasse: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique, update } } }));
vi.mock("@/lib/auth/garde", () => ({ exigerSession }));
vi.mock("@/lib/auth/motdepasse", () => ({
  hacherMotDePasse: vi.fn(async () => "nouvelle-empreinte"),
  verifierMotDePasse,
}));

import { PUT } from "@/app/api/account/password/route";

function requete(corps: unknown) {
  return new Request("http://localhost/api/account/password", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
}

const corpsValide = { currentPassword: "ancienmotdepasse", newPassword: "nouveaumotdepasse" };

beforeEach(() => {
  findUnique.mockReset();
  update.mockReset();
  exigerSession.mockReset();
  verifierMotDePasse.mockReset();
  exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: null });
});

describe("PUT /api/account/password", () => {
  it("refuse une requête sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    const reponse = await PUT(requete(corpsValide));
    expect(reponse.status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });

  it("refuse un nouveau mot de passe trop court", async () => {
    const reponse = await PUT(requete({ ...corpsValide, newPassword: "court" }));
    expect(reponse.status).toBe(400);
    expect((await reponse.json()).error.champs.newPassword).toBeDefined();
  });

  it("refuse un mot de passe actuel incorrect", async () => {
    findUnique.mockResolvedValue({ passwordHash: "empreinte" });
    verifierMotDePasse.mockResolvedValue(false);
    const reponse = await PUT(requete(corpsValide));
    expect(reponse.status).toBe(400);
    const corps = await reponse.json();
    expect(corps.error.code).toBe("MOTDEPASSEINCORRECT");
    expect(corps.error.champs.currentPassword).toBeDefined();
    expect(update).not.toHaveBeenCalled();
  });

  it("change le mot de passe de l'utilisatrice de la session uniquement", async () => {
    findUnique.mockResolvedValue({ passwordHash: "empreinte" });
    verifierMotDePasse.mockResolvedValue(true);
    const reponse = await PUT(requete(corpsValide));
    expect(reponse.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { passwordHash: "nouvelle-empreinte" },
    });
  });
});
