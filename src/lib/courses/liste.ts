import type { PlaceType } from "@prisma/client";
import { meilleurPrix, type ReleveDuLieu } from "@/lib/catalogue/cout";
import type { UniteAffichee } from "@/lib/catalogue/quantites";
import { unitesAAcheter } from "@/lib/courses/unites";

// Liste de courses d'un menu (CLAUDE.md §11) : quantités, stock déduit, unités du marché, coût.
// Règle 3 : tout est calculé par le code, jamais par l'IA.

export type RepasPourListe = {
  servings: number;
  recette: {
    servings: number;
    ingredients: { ingredientId: string; grams: number; optional: boolean }[];
  };
};

export type StockPourListe = { ingredientId: string; grams: number };

export type IngredientPourListe = {
  name: string;
  // Unité dans laquelle on achète l'ingrédient au marché (tas, sachet, pièce…)
  uniteAchat: UniteAffichee;
  releves: ReleveDuLieu[];
};

export type ArticleDeListe = {
  ingredientId: string;
  ingredient: string;
  quantite: number;
  unite: UniteAffichee;
  // Lieu du meilleur prix ; « où acheter » affine ce choix plus tard
  placeType: PlaceType | null;
  prixFcfa: number | null;
  nature: "releve" | "estimation" | "inconnu";
};

export type ListeDeCourses = {
  articles: ArticleDeListe[];
  totalFcfa: number;
  // Articles sans aucun prix, exclus du total
  sansPrix: string[];
};

/** Grammes nécessaires par ingrédient pour tous les repas, ajustés aux portions servies. */
export function besoinsDuMenu(repas: RepasPourListe[]): Map<string, number> {
  const besoins = new Map<string, number>();
  for (const { servings, recette } of repas) {
    const facteur = servings / Math.max(1, recette.servings);
    for (const ligne of recette.ingredients.filter((l) => !l.optional)) {
      besoins.set(
        ligne.ingredientId,
        (besoins.get(ligne.ingredientId) ?? 0) + ligne.grams * facteur,
      );
    }
  }
  return besoins;
}

/** Retire du besoin ce qui est déjà en stock ; un besoin couvert disparaît. */
export function deduireStock(
  besoins: Map<string, number>,
  stock: StockPourListe[],
): Map<string, number> {
  const restant = new Map(besoins);
  for (const article of stock) {
    const besoin = restant.get(article.ingredientId);
    if (besoin === undefined) continue;
    const reste = besoin - article.grams;
    if (reste <= 0) restant.delete(article.ingredientId);
    else restant.set(article.ingredientId, reste);
  }
  return restant;
}

/**
 * Le prix d'un article porte sur ce qu'on achète vraiment (3 tas), pas sur le besoin exact.
 * Un ingrédient absent du catalogue fourni est ignoré.
 */
export function listeDeCourses(
  repas: RepasPourListe[],
  stock: StockPourListe[],
  ingredients: Map<string, IngredientPourListe>,
  maintenant: Date,
): ListeDeCourses {
  const articles: ArticleDeListe[] = [];
  const sansPrix: string[] = [];
  let totalFcfa = 0;

  for (const [ingredientId, grams] of deduireStock(besoinsDuMenu(repas), stock)) {
    const ingredient = ingredients.get(ingredientId);
    if (!ingredient) continue;
    const quantite = unitesAAcheter(grams, ingredient.uniteAchat);
    if (quantite === 0) continue;

    const prix = meilleurPrix(ingredient.releves, maintenant);
    const prixFcfa = prix
      ? Math.round(((quantite * ingredient.uniteAchat.grams) / 1000) * prix.fcfaParKg)
      : null;
    if (prixFcfa === null) sansPrix.push(ingredient.name);
    else totalFcfa += prixFcfa;

    articles.push({
      ingredientId,
      ingredient: ingredient.name,
      quantite,
      unite: ingredient.uniteAchat,
      placeType: prix?.placeType ?? null,
      prixFcfa,
      nature: prix?.nature ?? "inconnu",
    });
  }

  return { articles, totalFcfa, sansPrix };
}
