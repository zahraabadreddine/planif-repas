import { describe, expect, it } from "vitest";
import { formaterTexteChat, segmentsGras } from "@/lib/agent/texte-chat";
import { noteAvecNoms, nomsIngredients } from "@/lib/planificateur/generation";
import { PROMPTSYSTEME } from "@/lib/agent/prompt";

// Les réponses d'Umi doivent rester lisibles sur un téléphone, même si le modèle écrit du Markdown.

const texteDe = (texte: string) =>
  formaterTexteChat(texte).map((b) => ({
    type: b.type,
    texte: b.segments.map((s) => s.texte).join(""),
  }));

describe("mise en forme des réponses du chat", () => {
  it("garde un paragraphe par ligne et ignore les lignes vides", () => {
    expect(texteDe("Bonsoir !\n\nVoici une idée.")).toEqual([
      { type: "paragraphe", texte: "Bonsoir !" },
      { type: "paragraphe", texte: "Voici une idée." },
    ]);
  });

  it("transforme les tirets en puces", () => {
    expect(texteDe("Ce soir :\n- Garba\n* Alloco")).toEqual([
      { type: "paragraphe", texte: "Ce soir :" },
      { type: "puce", texte: "Garba" },
      { type: "puce", texte: "Alloco" },
    ]);
  });

  it("garde les numéros d'une liste d'étapes", () => {
    expect(texteDe("1. Laver le riz\n2. Cuire")).toEqual([
      { type: "paragraphe", texte: "1. Laver le riz" },
      { type: "paragraphe", texte: "2. Cuire" },
    ]);
  });

  it("met le texte entre ** en gras, sans afficher les étoiles", () => {
    expect(segmentsGras("Un **garba** ce soir")).toEqual([
      { texte: "Un ", gras: false },
      { texte: "garba", gras: true },
      { texte: " ce soir", gras: false },
    ]);
  });

  it("laisse une étoile seule, ou un gras pas encore fermé pendant le flux", () => {
    expect(segmentsGras("5 * 2 et **gar")).toEqual([{ texte: "5 * 2 et **gar", gras: false }]);
  });

  it("rend un tableau lisible : cellules séparées par « · », sans ligne de tirets", () => {
    const tableau = "| Jour | Plat | Coût |\n|---|:---:|---|\n| Lundi | Garba | 1 500 FCFA |";
    expect(texteDe(tableau)).toEqual([
      { type: "paragraphe", texte: "Jour · Plat · Coût" },
      { type: "paragraphe", texte: "Lundi · Garba · 1 500 FCFA" },
    ]);
  });

  it("retire les dièses des titres", () => {
    expect(texteDe("## Menu de la semaine")).toEqual([
      { type: "paragraphe", texte: "Menu de la semaine" },
    ]);
  });
});

describe("note du menu : ingrédients servis deux fois", () => {
  const recettes = [
    {
      ingredients: [
        { id: "i1", name: "Poulet" },
        { id: "i2", name: "Riz" },
      ],
    },
    { ingredients: [{ id: "i1", name: "Poulet" }] },
  ];

  it("donne les noms, jamais les identifiants, sans doublon", () => {
    expect(nomsIngredients(["i1", "i2", "i1"], recettes)).toEqual(["poulet", "riz"]);
  });

  it("traduit la note d'un ancien menu enregistrée avec des identifiants", () => {
    const note =
      "Servi deux fois faute d'assez de recettes : f3b5fb5c-1e8c-4599-b854-92d04cce72c6, 02ecb908-9e51-411d-8b01-99242939fc21.";
    const noms = new Map([
      ["f3b5fb5c-1e8c-4599-b854-92d04cce72c6", "Œufs"],
      ["02ecb908-9e51-411d-8b01-99242939fc21", "Poulet"],
    ]);
    expect(noteAvecNoms(note, noms)).toBe(
      "Servi deux fois faute d'assez de recettes : œufs, poulet.",
    );
    expect(noteAvecNoms("Rien à signaler.", noms)).toBe("Rien à signaler.");
  });

  it("reste lisible pour un identifiant inconnu", () => {
    expect(nomsIngredients(["inconnu"], recettes)).toEqual(["un ingrédient"]);
  });
});

describe("consignes d'écriture d'Umi", () => {
  it("demande des réponses courtes, sans tableau ni Markdown", () => {
    expect(PROMPTSYSTEME).toContain("3 ou 4 phrases");
    expect(PROMPTSYSTEME).toContain("Pas de tableau ni de mise en forme Markdown");
  });

  it("ne recopie pas le contenu d'une carte de proposition", () => {
    expect(PROMPTSYSTEME).toContain("tu ne recopies pas son contenu");
  });
});
