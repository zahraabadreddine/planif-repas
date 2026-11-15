import { describe, expect, it } from "vitest";
import { gesteDeLEtape } from "@/lib/catalogue/gestes";
import { recettesIa } from "../../prisma/recettes-ia.ts";

// Le dessin d'une étape vient de ses mots : le bon geste, le four d'abord, rien si on hésite.

describe("le geste d'une étape", () => {
  it("reconnaît chaque geste, avec ou sans accents", () => {
    expect(gesteDeLEtape("Coupe 2 oignons en morceaux.")).toBe("couper");
    expect(gesteDeLEtape("Épluche les pommes de terre.")).toBe("eplucher");
    expect(gesteDeLEtape("Epluche les pommes de terre.")).toBe("eplucher");
    expect(gesteDeLEtape("Rince 150 g de riz.")).toBe("laver");
    expect(gesteDeLEtape("Mélange la farine et le sel.")).toBe("melanger");
    expect(gesteDeLEtape("Mixe 3 tomates et 1 oignon.")).toBe("mixer");
    expect(gesteDeLEtape("Laisse mijoter 20 minutes.")).toBe("marmite");
    expect(gesteDeLEtape("Ajoute le piment.")).toBe("verser");
    expect(gesteDeLEtape("Sers bien chaud.")).toBe("servir");
  });

  it("« fais revenir » c'est la poêle, « fais bouillir » c'est la marmite", () => {
    expect(gesteDeLEtape("Fais revenir l'oignon dans l'huile.")).toBe("poele");
    expect(gesteDeLEtape("Fais bouillir 1 L d'eau.")).toBe("marmite");
  });

  it("le poisson braisé va sur le gril", () => {
    expect(gesteDeLEtape("Fais griller les sardines sur les braises.")).toBe("griller");
  });

  it("le four passe avant le reste de la phrase", () => {
    expect(gesteDeLEtape("Découpe en losanges et cuis au four à 200 °C.")).toBe("four");
    expect(gesteDeLEtape("Enfourne 30 minutes.")).toBe("four");
  });

  it("c'est le premier geste cité qui compte", () => {
    expect(gesteDeLEtape("Coupe les tomates, puis ajoute-les à la sauce.")).toBe("couper");
    expect(gesteDeLEtape("Ajoute les tomates coupées.")).toBe("verser");
  });

  it("aucun dessin quand aucun geste n'est reconnu", () => {
    expect(gesteDeLEtape("Laisse reposer la pâte sous un linge.")).toBeNull();
    expect(gesteDeLEtape("")).toBeNull();
  });

  it("un mot qui en contient un autre ne trompe pas (« bouteille » n'est pas « bout »)", () => {
    expect(gesteDeLEtape("Garde la bouteille au frais.")).toBeNull();
  });

  it("presque toutes les étapes des recettes de l'équipe reçoivent un dessin", () => {
    const etapes = recettesIa([]).flatMap((r) => r.steps.map((e) => e.text));
    const avecDessin = etapes.filter((texte) => gesteDeLEtape(texte) !== null).length;
    expect(avecDessin / etapes.length).toBeGreaterThan(0.9);
  });
});
