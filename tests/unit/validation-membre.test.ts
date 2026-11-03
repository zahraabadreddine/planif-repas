import { describe, expect, it } from "vitest";
import {
  aDesRestrictions,
  membreSchema,
  normaliser,
  reconnaitreAllergene,
  type Membre,
} from "@/lib/validation/membre";

const valide: Membre = {
  label: "Awa",
  birthDate: "2019-03-12",
  ageGroup: null,
  allergies: ["arachide"],
  autresAllergies: ["Gombo"],
  regimes: ["sans-porc"],
};

const essayer = (modif: Record<string, unknown>) => membreSchema.safeParse({ ...valide, ...modif });

describe("schéma d'un membre", () => {
  it("accepte un membre complet", () => {
    expect(essayer({}).success).toBe(true);
  });

  it("accepte une tranche d'âge sans date de naissance", () => {
    expect(essayer({ birthDate: null, ageGroup: "adult" }).success).toBe(true);
  });

  it("exige la date de naissance ou la tranche d'âge", () => {
    const resultat = essayer({ birthDate: null, ageGroup: null });
    expect(resultat.success).toBe(false);
    expect(resultat.error?.issues[0].path).toEqual(["ageGroup"]);
  });

  it("refuse une date impossible, future ou trop ancienne", () => {
    expect(essayer({ birthDate: "2019-02-30" }).success).toBe(false);
    expect(essayer({ birthDate: "12/03/2019" }).success).toBe(false);
    expect(essayer({ birthDate: "2999-01-01" }).success).toBe(false);
    expect(essayer({ birthDate: "1850-01-01" }).success).toBe(false);
  });

  it("exige un surnom de 1 à 30 caractères, sans espaces autour", () => {
    expect(essayer({ label: "  Papa  " }).data?.label).toBe("Papa");
    expect(essayer({ label: "   " }).success).toBe(false);
    expect(essayer({ label: "x".repeat(31) }).success).toBe(false);
  });

  it("refuse une allergie ou un régime inconnus, ou choisis deux fois", () => {
    expect(essayer({ allergies: ["kiwi"] }).success).toBe(false);
    expect(essayer({ allergies: ["lait", "lait"] }).success).toBe(false);
    expect(essayer({ regimes: ["vegan"] }).success).toBe(false);
  });

  it("refuse une autre allergie en double, même écrite autrement", () => {
    expect(essayer({ autresAllergies: ["Gombo", "gombo "] }).success).toBe(false);
  });

  it("refuse un champ en trop, comme l'identifiant d'un autre foyer", () => {
    expect(essayer({ householdId: "foyer-b" }).success).toBe(false);
    expect(essayer({ id: "m1" }).success).toBe(false);
  });

  it("repère les données de santé, qui demandent le consentement", () => {
    expect(aDesRestrictions(valide)).toBe(true);
    expect(aDesRestrictions({ ...valide, allergies: [], autresAllergies: [], regimes: [] })).toBe(
      false,
    );
  });
});

describe("reconnaissance des allergies tapées par le parent", () => {
  it("reconnaît les mots courants, au pluriel, avec ou sans accents", () => {
    expect(reconnaitreAllergene("Cacahuètes")).toBe("arachide");
    expect(reconnaitreAllergene("crevettes")).toBe("crustaces");
    expect(reconnaitreAllergene("Blé")).toBe("gluten");
    expect(reconnaitreAllergene("NOIX")).toBe("fruits-a-coque");
    expect(reconnaitreAllergene("œufs")).toBe("oeuf");
    expect(reconnaitreAllergene("beurre de cacahuète")).toBe("arachide");
  });

  it("ne reconnaît pas un aliment hors des 14 allergènes", () => {
    expect(reconnaitreAllergene("gombo")).toBeNull();
    expect(reconnaitreAllergene("kiwi")).toBeNull();
  });

  it("normalise les majuscules, accents et espaces", () => {
    expect(normaliser("  Pâte   d'Arachide ")).toBe("pate d'arachide");
  });
});
