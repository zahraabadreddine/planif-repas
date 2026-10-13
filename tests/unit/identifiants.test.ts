import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, verifierMotDePasse } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  verifierMotDePasse: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique } } }));
vi.mock("@/lib/auth/motdepasse", () => ({
  hacherMotDePasse: vi.fn(async () => "empreinte-factice"),
  verifierMotDePasse,
}));

import { TropDeTentatives, verifierIdentifiants } from "@/lib/auth/identifiants";
import { limiteConnexion, TENTATIVESMAX } from "@/lib/auth/limite";

const utilisatrice = {
  id: "u1",
  email: "aminata@exemple.ci",
  fullName: "Aminata Koné",
  role: "user",
  passwordHash: "empreinte",
};

beforeEach(() => {
  findUnique.mockReset();
  verifierMotDePasse.mockReset();
  limiteConnexion.reinitialiser(utilisatrice.email);
});

describe("verifierIdentifiants", () => {
  it("refuse une entrée invalide sans interroger la base", async () => {
    expect(await verifierIdentifiants({ email: "x" })).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("refuse un email inconnu en comparant quand même un mot de passe", async () => {
    findUnique.mockResolvedValue(null);
    verifierMotDePasse.mockResolvedValue(false);
    expect(await verifierIdentifiants({ email: "inconnue@exemple.ci", password: "x" })).toBeNull();
    expect(verifierMotDePasse).toHaveBeenCalled();
  });

  it("refuse un mauvais mot de passe", async () => {
    findUnique.mockResolvedValue(utilisatrice);
    verifierMotDePasse.mockResolvedValue(false);
    expect(await verifierIdentifiants({ email: utilisatrice.email, password: "x" })).toBeNull();
  });

  it("renvoie l'utilisatrice sans son empreinte quand tout est correct", async () => {
    findUnique.mockResolvedValue(utilisatrice);
    verifierMotDePasse.mockResolvedValue(true);
    const resultat = await verifierIdentifiants({
      email: " Aminata@Exemple.ci ",
      password: "motdepasse",
    });
    expect(resultat).toEqual({
      id: "u1",
      email: utilisatrice.email,
      name: "Aminata Koné",
      role: "user",
    });
  });

  it("bloque l'email après trop d'échecs", async () => {
    findUnique.mockResolvedValue(utilisatrice);
    verifierMotDePasse.mockResolvedValue(false);
    for (let i = 0; i < TENTATIVESMAX; i++) {
      await verifierIdentifiants({ email: utilisatrice.email, password: "x" });
    }
    await expect(
      verifierIdentifiants({ email: utilisatrice.email, password: "motdepasse" }),
    ).rejects.toBeInstanceOf(TropDeTentatives);
  });
});
