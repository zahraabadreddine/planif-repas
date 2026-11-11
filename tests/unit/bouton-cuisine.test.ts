import { describe, expect, it } from "vitest";
import { texteDeductions } from "@/app/(famille)/menu/bouton-cuisine";

// Ce que la famille lit après « C'est cuisiné » : les quantités viennent du code (règle 3).

describe("message après un repas cuisiné", () => {
  it("liste ce qui a été retiré du stock, à la française", () => {
    expect(
      texteDeductions([
        { ingredientName: "Tomate", quantity: 0.6667, unitLabel: "tas" },
        { ingredientName: "Riz", quantity: 1, unitLabel: "kg" },
      ]),
    ).toBe("Retiré du stock : 0,7 tas tomate, 1 kg riz.");
  });

  it("le dit quand il n'y avait rien en stock", () => {
    expect(texteDeductions([])).toBe("Rien à retirer du stock pour ce repas.");
  });

  it("dit ce qui manquait dans le stock", () => {
    expect(
      texteDeductions(
        [{ ingredientName: "Riz", quantity: 0.5, unitLabel: "kg" }],
        ["Oignon", "Tomate"],
      ),
    ).toBe(
      "Retiré du stock : 0,5 kg riz. Pas (assez) en stock : oignon, tomate. Si tu les avais achetés, ajoute-les dans le stock.",
    );
  });
});
