import { describe, expect, it } from "vitest";
import { texteWhatsApp, partageWhatsApp } from "@/lib/courses/whatsapp";
import type { ListeEnregistree } from "@/lib/courses/generation";

const liste: ListeEnregistree = {
  id: "l1",
  mealPlanId: "mp1",
  estimatedTotalFcfa: 12500,
  remainingFcfa: 8000,
  sharedAt: null,
  items: [
    {
      id: "i1",
      ingredientId: "a",
      ingredient: "Tomate",
      quantity: 6,
      unit: "tas",
      estimatedPriceFcfa: 2000,
      placeType: "market",
      checked: false,
    },
    {
      id: "i2",
      ingredientId: "b",
      ingredient: "Huile",
      quantity: 1,
      unit: "litre",
      estimatedPriceFcfa: 1500,
      placeType: "supermarket",
      checked: false,
    },
    {
      id: "i3",
      ingredientId: "c",
      ingredient: "Oignon",
      quantity: 3,
      unit: "pièce",
      estimatedPriceFcfa: 500,
      placeType: "market",
      checked: true,
    },
  ],
};

describe("texteWhatsApp", () => {
  it("contient le total estimé en FCFA", () => {
    const texte = texteWhatsApp(liste);
    expect(texte).toContain("FCFA");
  });

  it("regroupe les articles par lieu", () => {
    const texte = texteWhatsApp(liste);
    expect(texte).toContain("MARCHÉ");
    expect(texte).toContain("SUPERMARCHÉ");
    expect(texte).toContain("Tomate");
    expect(texte).toContain("Huile");
  });

  it("affiche les quantités en unités du marché", () => {
    const texte = texteWhatsApp(liste);
    expect(texte).toContain("6 tas");
    expect(texte).toContain("1 litre");
  });
});

describe("partageWhatsApp", () => {
  it("renvoie un lien wa.me avec le texte encodé", () => {
    const { text, link } = partageWhatsApp(liste);
    expect(link).toContain("https://wa.me/?text=");
    expect(link).toContain(encodeURIComponent("FCFA"));
    expect(text).toContain("Tomate");
  });
});
