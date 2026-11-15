import { describe, expect, it } from "vitest";
import { iconeAliment } from "@/lib/stock/icone-aliment";
import { ingredientsIa } from "../../prisma/recettes-ia.ts";

// Le dessin d'un aliment du frigo vient de son nom puis de sa catégorie, jamais une tomate
// par défaut : un poulet, une viande ou une herbe ne ressemblent pas à une tomate.

describe("le dessin d'un aliment du frigo", () => {
  it("la viande, la volaille et le poisson ont leur propre dessin", () => {
    expect(iconeAliment("Poulet", "volaille")).toBe("poulet");
    expect(iconeAliment("Bœuf haché", "viande")).toBe("viande");
    expect(iconeAliment("Lardons", "porc")).toBe("viande");
    expect(iconeAliment("Tilapia", "poisson")).toBe("poisson");
  });

  it("une crevette n'est pas un poisson", () => {
    expect(iconeAliment("Crevettes", "fruits de mer")).toBe("crevette");
    expect(iconeAliment("Crabe", "fruits de mer")).toBe("crevette");
  });

  it("les légumes de la capture ne sont plus des tomates", () => {
    expect(iconeAliment("Persil", "herbe")).toBe("feuilles");
    expect(iconeAliment("Poireau", "légume")).toBe("feuilles");
    expect(iconeAliment("Chou", "légume")).toBe("feuilles");
    expect(iconeAliment("Poivron", "légume")).toBe("poivron");
    expect(iconeAliment("Carotte", "légume")).toBe("carotte");
    expect(iconeAliment("Navet", "légume")).toBe("carotte");
    // Le gingembre a sa racine noueuse : il ne ressemble pas à une pomme de terre
    expect(iconeAliment("Gingembre", "légume")).toBe("gingembre");
    expect(iconeAliment("Pomme de terre", "légume")).toBe("tubercule");
    expect(iconeAliment("Ail", "légume")).toBe("ail");
    expect(iconeAliment("Citron", "fruit")).toBe("citron");
  });

  it("le nom passe avant la catégorie : une boîte reste une boîte", () => {
    expect(iconeAliment("Thon en boîte", "poisson")).toBe("conserve");
    expect(iconeAliment("Feuille de manioc", "légume")).toBe("feuilles");
    expect(iconeAliment("Pâte de manioc fermentée", "féculent")).toBe("tubercule");
    expect(iconeAliment("Coriandre moulue", "épice")).toBe("sachet");
    expect(iconeAliment("Coriandre fraîche", "herbe")).toBe("feuilles");
  });

  it("« ail » ne se cache pas dans un autre mot", () => {
    expect(iconeAliment("Volaille maison", "volaille")).toBe("poulet");
  });

  it("un aliment inconnu prend sa catégorie, sinon un sachet neutre, jamais une tomate", () => {
    expect(iconeAliment("Patate inconnue", "légume")).toBe("tubercule");
    expect(iconeAliment("Fruit mystère", "fruit")).toBe("citron");
    expect(iconeAliment("Produit mystère", "autre")).toBe("sachet");
  });

  it("aucun ingrédient ajouté par l'équipe ne prend la tomate", () => {
    for (const ingredient of ingredientsIa) {
      expect(iconeAliment(ingredient.name, ingredient.category), ingredient.name).not.toBe(
        "tomate",
      );
    }
  });
});
