import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findUnique } = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({ auth }));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique } } }));

import {
  accesAuFoyer,
  exigerAdmin,
  exigerEcriture,
  exigerProprietaire,
  exigerSession,
} from "@/lib/auth/garde";

function connecter(id: string) {
  auth.mockResolvedValue({ user: { id } });
}

/** Compte lu en base : foyer, droit enregistré et propriétaire du foyer. */
function ligne(
  id: string,
  householdId: string | null,
  householdAccess: "edit" | "view" | null,
  proprietaire: string,
) {
  return {
    id,
    role: "user",
    householdId,
    householdAccess,
    household: householdId ? { ownerId: proprietaire } : null,
  };
}

beforeEach(() => {
  auth.mockReset();
  findUnique.mockReset();
});

describe("exigerSession", () => {
  it("refuse une requête sans session (401)", async () => {
    auth.mockResolvedValue(null);
    await expect(exigerSession()).rejects.toMatchObject({ code: "NONCONNECTE", status: 401 });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("refuse un compte supprimé depuis la connexion (401)", async () => {
    connecter("u1");
    findUnique.mockResolvedValue(null);
    await expect(exigerSession()).rejects.toMatchObject({ code: "NONCONNECTE", status: 401 });
  });

  it("renvoie le rôle, le foyer et le droit lus en base, pas ceux du jeton", async () => {
    auth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    findUnique.mockResolvedValue(ligne("u1", "f1", null, "u1"));
    await expect(exigerSession()).resolves.toEqual({
      userId: "u1",
      role: "user",
      householdId: "f1",
      acces: "proprietaire",
    });
  });
});

describe("droit sur le foyer", () => {
  it("reconnaît le propriétaire par le foyer, pas par le champ d'accès", () => {
    expect(accesAuFoyer(ligne("u1", "f1", "view", "u1"))).toBe("proprietaire");
  });

  it("donne le droit de la personne invitée", () => {
    expect(accesAuFoyer(ligne("u2", "f1", "edit", "u1"))).toBe("edit");
    expect(accesAuFoyer(ligne("u2", "f1", "view", "u1"))).toBe("view");
  });

  it("met en lecture seule une personne invitée sans droit enregistré", () => {
    expect(accesAuFoyer(ligne("u2", "f1", null, "u1"))).toBe("view");
  });

  it("n'a aucun droit sans foyer, même avec un ancien droit resté en base", () => {
    expect(accesAuFoyer({ ...ligne("u2", null, "edit", "u1"), household: null })).toBeNull();
  });
});

describe("exigerEcriture", () => {
  it("refuse une personne invitée en lecture seule (403)", async () => {
    connecter("u2");
    findUnique.mockResolvedValue(ligne("u2", "f1", "view", "u1"));
    await expect(exigerEcriture()).rejects.toMatchObject({ code: "LECTURESEULE", status: 403 });
  });

  it("accepte le propriétaire, une personne qui peut modifier et un compte sans foyer", async () => {
    for (const [id, foyer, droit] of [
      ["u1", "f1", null],
      ["u2", "f1", "edit"],
      ["u3", null, null],
    ] as const) {
      connecter(id);
      findUnique.mockResolvedValue(ligne(id, foyer, droit, "u1"));
      await expect(exigerEcriture()).resolves.toMatchObject({ userId: id });
    }
  });
});

describe("exigerProprietaire", () => {
  it("refuse une personne invitée, même si elle peut modifier (403)", async () => {
    connecter("u2");
    findUnique.mockResolvedValue(ligne("u2", "f1", "edit", "u1"));
    await expect(exigerProprietaire()).rejects.toMatchObject({ code: "INTERDIT", status: 403 });
  });

  it("demande d'abord un foyer (409)", async () => {
    connecter("u3");
    findUnique.mockResolvedValue(ligne("u3", null, null, "u1"));
    await expect(exigerProprietaire()).rejects.toMatchObject({ code: "FOYERMANQUANT" });
  });

  it("accepte la personne qui a créé le foyer", async () => {
    connecter("u1");
    findUnique.mockResolvedValue(ligne("u1", "f1", null, "u1"));
    await expect(exigerProprietaire()).resolves.toMatchObject({ householdId: "f1" });
  });
});

describe("exigerAdmin", () => {
  it("refuse une requête sans session (401)", async () => {
    auth.mockResolvedValue(null);
    await expect(exigerAdmin()).rejects.toMatchObject({ code: "NONCONNECTE", status: 401 });
  });

  it("refuse un compte non admin (403)", async () => {
    connecter("u1");
    findUnique.mockResolvedValue({ id: "u1", role: "user", householdId: "f1" });
    await expect(exigerAdmin()).rejects.toMatchObject({ code: "INTERDIT", status: 403 });
  });

  it("accepte un compte admin", async () => {
    connecter("a1");
    findUnique.mockResolvedValue({ id: "a1", role: "admin", householdId: null });
    await expect(exigerAdmin()).resolves.toMatchObject({ userId: "a1", role: "admin" });
  });
});
