import { describe, expect, it } from "vitest";
import { hacherMotDePasse, verifierMotDePasse } from "@/lib/auth/motdepasse";

describe("hachage du mot de passe", () => {
  it("ne garde jamais le mot de passe en clair et le vérifie", async () => {
    const empreinte = await hacherMotDePasse("motdepasse");
    expect(empreinte).not.toContain("motdepasse");
    expect(await verifierMotDePasse("motdepasse", empreinte)).toBe(true);
    expect(await verifierMotDePasse("mauvais", empreinte)).toBe(false);
  });
});
