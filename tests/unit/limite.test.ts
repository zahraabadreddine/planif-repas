import { describe, expect, it } from "vitest";
import { creerLimiteur, FENETREMS, TENTATIVESMAX } from "@/lib/auth/limite";

describe("limiteur de connexion", () => {
  it("bloque après le nombre maximum d'échecs", () => {
    const limiteur = creerLimiteur(TENTATIVESMAX, FENETREMS);
    for (let i = 0; i < TENTATIVESMAX - 1; i++) limiteur.noterEchec("a@b.ci", 0);
    expect(limiteur.estBloque("a@b.ci", 0)).toBe(false);
    limiteur.noterEchec("a@b.ci", 0);
    expect(limiteur.estBloque("a@b.ci", 0)).toBe(true);
    expect(limiteur.estBloque("autre@b.ci", 0)).toBe(false);
  });

  it("débloque une fois la fenêtre passée", () => {
    const limiteur = creerLimiteur(TENTATIVESMAX, FENETREMS);
    for (let i = 0; i < TENTATIVESMAX; i++) limiteur.noterEchec("a@b.ci", 0);
    expect(limiteur.estBloque("a@b.ci", FENETREMS - 1)).toBe(true);
    expect(limiteur.estBloque("a@b.ci", FENETREMS)).toBe(false);
  });

  it("remet le compteur à zéro après une connexion réussie", () => {
    const limiteur = creerLimiteur(TENTATIVESMAX, FENETREMS);
    for (let i = 0; i < TENTATIVESMAX; i++) limiteur.noterEchec("a@b.ci", 0);
    limiteur.reinitialiser("a@b.ci");
    expect(limiteur.estBloque("a@b.ci", 0)).toBe(false);
  });
});
