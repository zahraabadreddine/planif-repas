import { describe, expect, it } from "vitest";
import {
  changementMotDePasseSchema,
  erreursParChamp,
  formulaireInscriptionSchema,
  inscriptionSchema,
} from "@/lib/validation/compte";

const inscriptionValide = {
  fullName: "Aminata Koné",
  email: "aminata@exemple.ci",
  password: "motdepasse",
  consentHealth: true,
  consentLocation: false,
};

describe("inscriptionSchema", () => {
  it("accepte une inscription valide et normalise l'email", () => {
    const resultat = inscriptionSchema.parse({
      ...inscriptionValide,
      email: "  Aminata@Exemple.CI ",
    });
    expect(resultat.email).toBe("aminata@exemple.ci");
  });

  it("refuse un mot de passe trop court", () => {
    const resultat = inscriptionSchema.safeParse({ ...inscriptionValide, password: "court" });
    expect(resultat.success).toBe(false);
  });

  it("refuse un mot de passe de plus de 72 octets", () => {
    const resultat = inscriptionSchema.safeParse({
      ...inscriptionValide,
      password: "é".repeat(37),
    });
    expect(resultat.success).toBe(false);
  });

  it("refuse un email invalide", () => {
    const resultat = inscriptionSchema.safeParse({ ...inscriptionValide, email: "pas-un-email" });
    expect(resultat.success).toBe(false);
  });
});

describe("formulaireInscriptionSchema", () => {
  it("signale une confirmation différente sur le champ confirmation", () => {
    const resultat = formulaireInscriptionSchema.safeParse({
      ...inscriptionValide,
      confirmation: "autrechose",
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(erreursParChamp(resultat.error).confirmation).toBe(
        "Les deux mots de passe ne sont pas identiques.",
      );
    }
  });
});

describe("changementMotDePasseSchema", () => {
  it("refuse un nouveau mot de passe identique à l'actuel", () => {
    const resultat = changementMotDePasseSchema.safeParse({
      currentPassword: "motdepasse",
      newPassword: "motdepasse",
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      expect(erreursParChamp(resultat.error).newPassword).toBeDefined();
    }
  });
});

describe("erreursParChamp", () => {
  it("garde un seul message par champ", () => {
    const resultat = inscriptionSchema.safeParse({
      ...inscriptionValide,
      fullName: "",
      email: "x",
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      const erreurs = erreursParChamp(resultat.error);
      expect(Object.keys(erreurs).sort()).toEqual(["email", "fullName"]);
      expect(typeof erreurs.fullName).toBe("string");
    }
  });
});
