import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { listerMembres } from "@/lib/foyer/membres";
import {
  incompatibilites,
  restrictionsDuFoyer,
  type IngredientAFiltrer,
} from "@/lib/planificateur/filtres";

// EF-16 : Proposer des recettes faisables avec le stock (« vider le frigo »).
// Règle §3.2 : les allergènes sont filtrés par le code, pas par l'IA.
// Règle §3.3 : toutes les quantités sont calculées par le code.

export type SuggestionRecette = {
  id: string;
  title: string;
  cuisine: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  difficulty: number;
  tags: string[];
  utiliseUseSoon: boolean;
};

type StockParIngredient = Map<string, number>;

/** Convertit les articles du stock en grammes par ingrédient. */
function stockEnGrammes(
  articles: { ingredientId: string; quantity: number; unit: { gramsEquivalent: number } }[],
): StockParIngredient {
  const parIngredient = new Map<string, number>();
  for (const a of articles) {
    const grammes = a.quantity * a.unit.gramsEquivalent;
    parIngredient.set(a.ingredientId, (parIngredient.get(a.ingredientId) ?? 0) + grammes);
  }
  return parIngredient;
}

/** Vérifie si le stock couvre tous les ingrédients requis d'une recette. */
function recetteFaisable(
  ingredientsRecette: {
    ingredientId: string;
    quantity: number;
    optional: boolean;
    unit: { gramsEquivalent: number };
  }[],
  stockGrammes: StockParIngredient,
  facteur: number,
): boolean {
  for (const ri of ingredientsRecette) {
    if (ri.optional) continue;
    const besoinGrammes = ri.quantity * ri.unit.gramsEquivalent * facteur;
    const disponibleGrammes = stockGrammes.get(ri.ingredientId) ?? 0;
    if (disponibleGrammes < besoinGrammes) return false;
  }
  return true;
}

/**
 * Suggestions de recettes faisables uniquement avec le stock du foyer.
 * Les allergènes sont filtrés par le code (règle §3.2).
 * Les quantités sont calculées par le code (règle §3.3).
 */
export async function suggererRecettes(session: SessionVerifiee): Promise<SuggestionRecette[]> {
  const householdId = session.householdId;
  if (!householdId) throw new ErreurApi("FOYERMANQUANT");

  const [articles, membres, recettes] = await Promise.all([
    prisma.stockItem.findMany({
      where: { householdId, status: { in: ["ok", "useSoon"] }, quantity: { gt: 0 } },
      select: {
        ingredientId: true,
        quantity: true,
        status: true,
        unit: { select: { gramsEquivalent: true } },
      },
    }),
    listerMembres(session),
    prisma.recipe.findMany({
      where: { validated: true },
      include: {
        ingredients: {
          include: {
            ingredient: { select: { name: true, category: true, allergens: true } },
            unit: { select: { gramsEquivalent: true } },
          },
        },
      },
    }),
  ]);

  if (articles.length === 0) return [];

  const stockGrammes = stockEnGrammes(articles);
  const restrictions = restrictionsDuFoyer(membres);
  const nbMembres = Math.max(membres.length, 1);

  const ingredientsUseSoon = new Set(
    articles.filter((a) => a.status === "useSoon").map((a) => a.ingredientId),
  );

  const suggestions: SuggestionRecette[] = [];

  for (const recette of recettes) {
    const ingredientsPourFiltre: IngredientAFiltrer[] = recette.ingredients.map((ri) => ({
      name: ri.ingredient.name,
      category: ri.ingredient.category,
      allergens: ri.ingredient.allergens,
    }));

    if (incompatibilites(ingredientsPourFiltre, restrictions).length > 0) continue;

    const facteur = nbMembres / recette.servings;

    if (!recetteFaisable(recette.ingredients, stockGrammes, facteur)) continue;

    const utiliseUseSoon = recette.ingredients.some(
      (ri) => !ri.optional && ingredientsUseSoon.has(ri.ingredientId),
    );

    suggestions.push({
      id: recette.id,
      title: recette.title,
      cuisine: recette.cuisine,
      prepMinutes: recette.prepMinutes,
      cookMinutes: recette.cookMinutes,
      servings: recette.servings,
      difficulty: recette.difficulty,
      tags: recette.tags,
      utiliseUseSoon,
    });
  }

  suggestions.sort((a, b) => {
    if (a.utiliseUseSoon !== b.utiliseUseSoon) return a.utiliseUseSoon ? -1 : 1;
    return a.prepMinutes + a.cookMinutes - (b.prepMinutes + b.cookMinutes);
  });

  return suggestions;
}
