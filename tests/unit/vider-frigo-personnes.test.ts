import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));

import { personnesPossibles } from "@/lib/stock/vider-frigo";

// Pour combien de personnes le stock permet une recette : calculé par le code (règle 3).

const ligne = (ingredientId: string, quantity: number, optional = false) => ({
  ingredientId,
  quantity,
  optional,
  unit: { gramsEquivalent: 1 },
});

describe("personnes possibles avec le stock", () => {
  // Recette pour 4 : 400 g de riz (100 g par personne), 200 g de poulet (50 g par personne)
  const recette = [ligne("riz", 400), ligne("poulet", 200), ligne("persil", 20, true)];

  it("l'ingrédient le plus juste décide", () => {
    const stock = new Map([
      ["riz", 1000],
      ["poulet", 120],
    ]);
    expect(personnesPossibles(recette, stock, 4)).toBe(2);
  });

  it("un ingrédient facultatif absent ne bloque pas", () => {
    const stock = new Map([
      ["riz", 400],
      ["poulet", 200],
    ]);
    expect(personnesPossibles(recette, stock, 4)).toBe(4);
  });

  it("un ingrédient obligatoire absent : personne", () => {
    expect(personnesPossibles(recette, new Map([["riz", 1000]]), 4)).toBe(0);
  });
});
