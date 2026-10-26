import { describe, expect, it } from "vitest";
import { unitesAAcheter } from "@/lib/courses/unites";

const tas = { label: "tas", grams: 500 };

describe("conversion en unités du marché", () => {
  it("1,4 kg de tomates avec un tas de 500 g donne 3 tas", () => {
    expect(unitesAAcheter(1400, tas)).toBe(3);
  });

  it("une quantité exacte n'ajoute pas d'unité", () => {
    expect(unitesAAcheter(1000, tas)).toBe(2);
    expect(unitesAAcheter(0.1 + 0.2, { label: "g", grams: 0.3 })).toBe(1);
  });

  it("une petite quantité demande au moins une unité", () => {
    expect(unitesAAcheter(20, tas)).toBe(1);
  });

  it("rien à acheter pour une quantité nulle", () => {
    expect(unitesAAcheter(0, tas)).toBe(0);
  });
});
