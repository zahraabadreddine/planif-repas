import { describe, expect, it } from "vitest";
import { formaterProposition, repasParJour } from "@/lib/agent/cartes-propositions";

// La carte « Menu de la semaine » montre les repas proposés : la famille voit ce qu'elle confirme.

const repas = [
  { date: "2026-11-17", slot: "dinner", recette: "Alloco et œufs" },
  { date: "2026-11-16", slot: "dinner", recette: "Attiéké poisson" },
  { date: "2026-11-16", slot: "lunch", recette: "Garba" },
];

describe("carte du menu de la semaine", () => {
  it("range les repas par jour, midi avant soir", () => {
    expect(repasParJour(repas)).toEqual([
      "lun. 16 · midi : Garba · soir : Attiéké poisson",
      "mar. 17 · soir : Alloco et œufs",
    ]);
  });

  it("ignore un contenu mal formé sans planter", () => {
    expect(repasParJour(undefined)).toEqual([]);
    expect(repasParJour([{ date: 3 }, null])).toEqual([]);
  });

  it("donne le détail, un coût lisible et le lien vers la page Menu", () => {
    const carte = formaterProposition({
      id: "p1",
      type: "weekPlan",
      status: "pending",
      payload: { weekStart: "2026-11-16", estimatedCostFcfa: 8681, meals: repas },
    });
    expect(carte).toMatchObject({
      title: "Menu de la semaine",
      // fcfa() sépare les milliers par une espace fine insécable (U+202F)
      summary: "8 681 FCFA estimés",
      lien: { href: "/menu", texte: "Voir sur la page Menu" },
    });
    expect((carte as { details: string[] }).details).toHaveLength(2);
  });
});
