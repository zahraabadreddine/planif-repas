import { describe, expect, it } from "vitest";
import { coutRecette, meilleurPrix, type ReleveDuLieu } from "@/lib/catalogue/cout";

const maintenant = new Date("2026-10-18T12:00:00Z");
const recent = new Date("2026-10-11T12:00:00Z");

const au = (
  placeType: ReleveDuLieu["placeType"],
  priceFcfa: number,
  source: ReleveDuLieu["source"] = "team",
): ReleveDuLieu => ({ priceFcfa, grams: 1000, source, observedAt: recent, placeType });

describe("meilleur prix d'un ingrédient", () => {
  it("prend le lieu le moins cher", () => {
    expect(meilleurPrix([au("market", 700), au("supermarket", 1200)], maintenant)?.fcfaParKg).toBe(
      700,
    );
  });

  it("préfère un prix relevé à une estimation, même plus basse", () => {
    const prix = meilleurPrix([au("market", 900), au("supermarket", 500, "estimate")], maintenant);
    expect(prix).toMatchObject({ fcfaParKg: 900, nature: "releve" });
  });

  it("renvoie null sans aucun prix", () => {
    expect(meilleurPrix([], maintenant)).toBeNull();
  });
});

describe("coût d'une recette", () => {
  const lignes = [
    { ingredient: "Tomate", grams: 500, optional: false, releves: [au("market", 650)] },
    {
      ingredient: "Huile",
      grams: 60,
      optional: false,
      releves: [au("shop", 1300, "estimate")],
    },
    { ingredient: "Persil", grams: 100, optional: true, releves: [au("market", 2000)] },
    { ingredient: "Cube", grams: 10, optional: false, releves: [] },
  ];

  it("additionne les ingrédients, en FCFA entiers, par personne aussi", () => {
    // 0,5 kg × 650 + 0,06 kg × 1 300 = 325 + 78 = 403
    expect(coutRecette(lignes, 4, maintenant)).toMatchObject({
      totalFcfa: 403,
      parPersonneFcfa: 101,
    });
  });

  it("compte séparément les prix relevés et les prix estimés", () => {
    expect(coutRecette(lignes, 4, maintenant)).toMatchObject({ avecReleve: 1, avecEstimation: 1 });
  });

  it("exclut les ingrédients facultatifs et signale ceux sans prix", () => {
    expect(coutRecette(lignes, 4, maintenant).sansPrix).toEqual(["Cube"]);
  });
});
