import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, findUnique } = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/auth/config", () => ({ auth }));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique } } }));

import { exigerAdmin, exigerSession } from "@/lib/auth/garde";

function connecter(id: string) {
  auth.mockResolvedValue({ user: { id } });
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

  it("renvoie le rôle et le foyer lus en base, pas ceux du jeton", async () => {
    auth.mockResolvedValue({ user: { id: "u1", role: "admin" } });
    findUnique.mockResolvedValue({ id: "u1", role: "user", householdId: "f1" });
    await expect(exigerSession()).resolves.toEqual({
      userId: "u1",
      role: "user",
      householdId: "f1",
    });
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
