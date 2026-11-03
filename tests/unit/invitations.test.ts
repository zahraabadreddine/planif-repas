import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
process.env.AUTHSECRET = "secret-des-tests";

import { empreinteCode, genererCode } from "@/lib/foyer/invitations";
import {
  ALPHABETCODE,
  accesSchema,
  afficherCode,
  normaliserCode,
  rejoindreSchema,
  texteInvitation,
} from "@/lib/validation/invitation";

describe("code d'invitation", () => {
  it("fait 6 caractères, sans lettres ni chiffres faciles à confondre", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = genererCode();
      expect(code).toHaveLength(6);
      expect([...code].every((c) => ALPHABETCODE.includes(c))).toBe(true);
    }
    expect(ALPHABETCODE).not.toMatch(/[01OIL]/);
  });

  it("est tiré au hasard", () => {
    const codes = new Set(Array.from({ length: 200 }, genererCode));
    expect(codes.size).toBeGreaterThan(195);
  });

  it("a une empreinte stable qui ne contient pas le code", () => {
    expect(empreinteCode("K7M4PQ")).toBe(empreinteCode("K7M4PQ"));
    expect(empreinteCode("K7M4PQ")).not.toBe(empreinteCode("K7M4PR"));
    expect(empreinteCode("K7M4PQ")).not.toContain("K7M4PQ");
  });

  it("se lit et se tape facilement", () => {
    expect(afficherCode("K7M4PQ")).toBe("K7M 4PQ");
    expect(normaliserCode(" k7m-4pq ")).toBe("K7M4PQ");
  });
});

describe("règles des invitations", () => {
  it("accepte un code tapé avec espace ou en minuscules", () => {
    expect(rejoindreSchema.parse({ code: "k7m 4pq" })).toEqual({ code: "K7M4PQ" });
  });

  it("refuse un code trop court, trop long ou avec un champ en trop", () => {
    expect(rejoindreSchema.safeParse({ code: "K7M4P" }).success).toBe(false);
    expect(rejoindreSchema.safeParse({ code: "K7M4PQX" }).success).toBe(false);
    expect(rejoindreSchema.safeParse({ code: "K7M4PQ", householdId: "f2" }).success).toBe(false);
  });

  it("n'accepte que les deux droits prévus", () => {
    expect(accesSchema.safeParse({ access: "edit" }).success).toBe(true);
    expect(accesSchema.safeParse({ access: "view" }).success).toBe(true);
    expect(accesSchema.safeParse({ access: "proprietaire" }).success).toBe(false);
  });
});

describe("message WhatsApp de l'invitation", () => {
  it("donne le nom du foyer, l'adresse et le code lisible, sans identifiant", () => {
    const texte = texteInvitation("Famille Koné", "K7M4PQ", "https://umami.example");
    expect(texte).toContain("Famille Koné");
    expect(texte).toContain("https://umami.example");
    expect(texte).toContain("K7M 4PQ");
    expect(texte).toContain("48 h");
  });
});
