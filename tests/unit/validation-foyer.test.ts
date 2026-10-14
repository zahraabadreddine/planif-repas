import { describe, expect, it } from "vitest";
import {
  BUDGETMAX,
  BUDGETMIN,
  foyerSchema,
  lireMontantFcfa,
  valeursDuFoyer,
  type Foyer,
} from "@/lib/validation/foyer";

const valide: Foyer = {
  name: "Famille Test",
  weeklyBudgetFcfa: 25000,
  cuisinesPreferred: ["ivoirienne", "libanaise"],
  shoppingDay: 6,
};

const essayer = (modif: Record<string, unknown>) => foyerSchema.safeParse({ ...valide, ...modif });

describe("schéma du foyer", () => {
  it("accepte un foyer complet", () => {
    expect(essayer({}).success).toBe(true);
  });

  it("accepte aucune cuisine et pas de jour fixe", () => {
    expect(essayer({ cuisinesPreferred: [], shoppingDay: null }).success).toBe(true);
  });

  it("retire les espaces autour du nom et refuse un nom trop court ou trop long", () => {
    expect(essayer({ name: "  Famille Test  " }).data?.name).toBe("Famille Test");
    expect(essayer({ name: " A " }).success).toBe(false);
    expect(essayer({ name: "x".repeat(51) }).success).toBe(false);
  });

  it("accepte les bornes du budget et refuse les fautes de frappe", () => {
    expect(essayer({ weeklyBudgetFcfa: BUDGETMIN }).success).toBe(true);
    expect(essayer({ weeklyBudgetFcfa: BUDGETMAX }).success).toBe(true);
    expect(essayer({ weeklyBudgetFcfa: BUDGETMIN - 1 }).success).toBe(false);
    expect(essayer({ weeklyBudgetFcfa: BUDGETMAX + 1 }).success).toBe(false);
  });

  it("refuse un budget avec des décimales ou absent", () => {
    expect(essayer({ weeklyBudgetFcfa: 25000.5 }).success).toBe(false);
    expect(essayer({ weeklyBudgetFcfa: Number.NaN }).success).toBe(false);
    expect(essayer({ weeklyBudgetFcfa: "25000" }).success).toBe(false);
  });

  it("refuse une cuisine inconnue ou choisie deux fois", () => {
    expect(essayer({ cuisinesPreferred: ["japonaise"] }).success).toBe(false);
    expect(essayer({ cuisinesPreferred: ["ivoirienne", "ivoirienne"] }).success).toBe(false);
  });

  it("n'accepte que les jours 1 (lundi) à 7 (dimanche)", () => {
    expect(essayer({ shoppingDay: 1 }).success).toBe(true);
    expect(essayer({ shoppingDay: 7 }).success).toBe(true);
    expect(essayer({ shoppingDay: 0 }).success).toBe(false);
    expect(essayer({ shoppingDay: 8 }).success).toBe(false);
  });

  it("refuse un champ en trop, comme un identifiant de foyer", () => {
    expect(essayer({ householdId: "un-autre-foyer" }).success).toBe(false);
  });
});

describe("lecture du budget tapé par le parent", () => {
  it("accepte les façons courantes d'écrire un montant", () => {
    for (const saisie of ["25000", "25 000", "25.000", "25,000", "25000F", "25 000 FCFA", 25000]) {
      expect(lireMontantFcfa(saisie), String(saisie)).toBe(25000);
    }
  });

  it("donne NaN pour un champ vide ou illisible, refusé ensuite par le schéma", () => {
    expect(lireMontantFcfa("")).toBeNaN();
    expect(lireMontantFcfa(undefined)).toBeNaN();
    expect(lireMontantFcfa("vingt mille")).toBeNaN();
  });

  it("garde les décimales pour que le schéma les refuse", () => {
    expect(lireMontantFcfa("25000,5")).toBeNaN();
    expect(lireMontantFcfa("25000.5")).toBe(25000.5);
  });
});

describe("préremplissage du formulaire en modification", () => {
  it("retire l'identifiant du foyer lu en base, sinon le schéma refuserait l'envoi", () => {
    const enBase = { id: "f1", ...valide };
    expect(foyerSchema.safeParse(enBase).success).toBe(false);
    expect(foyerSchema.safeParse(valeursDuFoyer(enBase)).success).toBe(true);
    expect(valeursDuFoyer(enBase)).toEqual(valide);
  });
});
