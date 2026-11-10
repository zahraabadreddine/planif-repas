import { describe, expect, it } from "vitest";
import { equivalence, unitesAchat } from "@/lib/stock/unites-achat";

const tas = { id: "u-tas", label: "tas", grams: 250 };
const sachet = { id: "u-sachet", label: "sachet", grams: 1500 };
const kg = { id: "u-kg", label: "kg", grams: 1000 };

describe("équivalence affichée sous l'unité", () => {
  it("dit combien pèse une unité du marché", () => {
    expect(equivalence(tas)).toBe("1 tas ≈ 250 g");
  });

  it("passe en kilos à partir d'un kilo, à la française", () => {
    expect(equivalence(sachet)).toBe("1 sachet ≈ 1,5 kg");
  });

  it("n'affiche rien pour le kg lui-même", () => {
    expect(equivalence(kg)).toBeNull();
  });
});

describe("unités proposées pour déclarer un achat", () => {
  it("ajoute le kg aux unités de l'ingrédient", () => {
    expect(unitesAchat([tas], kg).map((u) => u.label)).toEqual(["tas", "kg"]);
  });

  it("ne propose pas deux fois le kg", () => {
    expect(unitesAchat([tas, kg], kg).filter((u) => u.label === "kg")).toHaveLength(1);
  });

  it("garde les unités de l'ingrédient s'il n'y a pas de kg dans le catalogue", () => {
    expect(unitesAchat([sachet, tas], null).map((u) => u.label)).toEqual(["sachet", "tas"]);
  });
});

describe("équivalence : pas d'arrondi trompeur", () => {
  it("1 250 g s'affiche 1,25 kg, pas 1,3 kg", () => {
    expect(equivalence({ id: "u", label: "botte", grams: 1250 })).toBe("1 botte ≈ 1,25 kg");
  });
});
