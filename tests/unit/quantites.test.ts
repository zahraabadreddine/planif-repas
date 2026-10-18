import { describe, expect, it } from "vitest";
import { afficherQuantite, nombre, pluriel } from "@/lib/catalogue/quantites";

const g = { label: "g", grams: 1 };
const oignon = [
  { label: "tas", grams: 500 },
  { label: "pièce", grams: 125 },
];

describe("affichage des quantités en unités du marché", () => {
  it("prend la plus grande unité de l'ingrédient qui tient au moins une fois", () => {
    expect(afficherQuantite(800, g, [{ label: "tranche", grams: 200 }])).toBe("≈ 4 tranches");
    expect(afficherQuantite(1000, g, oignon)).toBe("≈ 2 tas");
    expect(afficherQuantite(250, g, oignon)).toBe("≈ 2 pièces");
  });

  it("passe en kilos à partir de 100 g, à 10 g près", () => {
    expect(afficherQuantite(500, g, [])).toBe("0,5 kg");
    expect(afficherQuantite(250, g, [{ label: "sachet de 1 kg", grams: 1000 }])).toBe("0,25 kg");
    expect(afficherQuantite(400, g, [{ label: "barquette de 500 g", grams: 500 }])).toBe("0,4 kg");
    expect(afficherQuantite(120, g, [{ label: "pot de 450 g", grams: 450 }])).toBe("0,12 kg");
  });

  it("n'affiche jamais un arrondi trop éloigné de la vraie quantité", () => {
    // 600 g de spaghetti : « 1 paquet de 500 g » serait faux
    expect(afficherQuantite(600, g, [{ label: "paquet de 500 g", grams: 500 }])).toBe("0,6 kg");
    // 40 g de beurre : « 0,25 plaquette » ferait 62 g
    expect(afficherQuantite(40, g, [{ label: "plaquette de 250 g", grams: 250 }])).toBe(
      "≈ 2,5 c. à soupe",
    );
  });

  it("donne une fraction de la plus petite unité pour une petite quantité (un demi-oignon)", () => {
    expect(afficherQuantite(60, g, oignon)).toBe("≈ 0,5 pièce");
    expect(afficherQuantite(10, g, [{ label: "morceau", grams: 50 }])).toBe("≈ 0,25 morceau");
  });

  it("passe aux cuillères pour les très petites quantités, jamais aux grammes", () => {
    expect(afficherQuantite(15, g, [{ label: "sachet de 500 g", grams: 500 }])).toBe(
      "≈ 1 c. à soupe",
    );
    expect(afficherQuantite(1, g, [{ label: "sachet de 1 kg", grams: 1000 }])).toBe(
      "≈ 0,25 c. à café",
    );
    for (const grams of [1, 5, 10, 60, 90]) {
      expect(afficherQuantite(grams, g, [])).not.toMatch(/\d g\b/);
    }
  });

  it("garde les autres unités telles quelles, accordées au pluriel", () => {
    expect(afficherQuantite(2, { label: "gousse", grams: 5 }, [])).toBe("2 gousses");
    expect(afficherQuantite(1, { label: "boîte de 400 g", grams: 400 }, [])).toBe(
      "1 boîte de 400 g",
    );
    expect(afficherQuantite(300, { label: "ml", grams: 1 }, [])).toBe("300 ml");
    expect(afficherQuantite(1.5, { label: "c. à café", grams: 5 }, [])).toBe("1,5 c. à café");
  });
});

describe("accords et nombres", () => {
  it("accorde au pluriel au-delà de 1", () => {
    expect(pluriel("morceau", 2)).toBe("morceaux");
    expect(pluriel("boîte de 400 g", 2)).toBe("boîtes de 400 g");
    expect(pluriel("tas", 3)).toBe("tas");
    expect(pluriel("botte", 0.5)).toBe("botte");
  });

  it("écrit les décimales à la française", () => {
    expect(nombre(0.25)).toBe("0,25");
    expect(nombre(4)).toBe("4");
  });
});
