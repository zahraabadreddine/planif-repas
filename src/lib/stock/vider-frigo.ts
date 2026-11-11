import type { MealSlot } from "@prisma/client";
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
  // Repas où la recette se mange (déjeuner, dîner…)
  mealTypes: MealSlot[];
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
 * Nombre de personnes que le stock permet de servir avec une recette : pour chaque ingrédient
 * obligatoire, ce qu'il y a divisé par ce qu'il faut par personne ; le plus petit l'emporte.
 */
export function personnesPossibles(
  ingredientsRecette: {
    ingredientId: string;
    quantity: number;
    optional: boolean;
    unit: { gramsEquivalent: number };
  }[],
  stockGrammes: StockParIngredient,
  servings: number,
): number {
  const obligatoires = ingredientsRecette.filter((ri) => !ri.optional);
  if (obligatoires.length === 0) return 0;
  return Math.min(
    ...obligatoires.map((ri) => {
      const parPersonne = (ri.quantity * ri.unit.gramsEquivalent) / Math.max(1, servings);
      if (parPersonne <= 0) return Infinity;
      return Math.floor((stockGrammes.get(ri.ingredientId) ?? 0) / parPersonne);
    }),
  );
}

/** Une recette compatible avec le foyer, et ce que le stock permet d'en faire. */
type Analyse = SuggestionRecette & { complete: boolean; possibles: number };

/**
 * Analyse le stock du foyer : pour chaque recette validée sans allergène ni régime interdit,
 * si elle est faisable pour tout le monde, et pour combien de personnes au plus.
 * Les allergènes sont filtrés par le code (règle §3.2), les quantités calculées par le code (§3.3).
 */
async function analyserStock(
  session: SessionVerifiee,
  nbPersonnes?: number,
): Promise<{ analyses: Analyse[]; personnes: number }> {
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

  const nbMembres = nbPersonnes ?? Math.max(membres.length, 1);
  if (articles.length === 0) return { analyses: [], personnes: nbMembres };

  const stockGrammes = stockEnGrammes(articles);
  const restrictions = restrictionsDuFoyer(membres);

  const ingredientsUseSoon = new Set(
    articles.filter((a) => a.status === "useSoon").map((a) => a.ingredientId),
  );

  const analyses: Analyse[] = [];

  for (const recette of recettes) {
    const ingredientsPourFiltre: IngredientAFiltrer[] = recette.ingredients.map((ri) => ({
      name: ri.ingredient.name,
      category: ri.ingredient.category,
      allergens: ri.ingredient.allergens,
    }));

    if (incompatibilites(ingredientsPourFiltre, restrictions).length > 0) continue;

    const facteur = nbMembres / recette.servings;
    const complete = recetteFaisable(recette.ingredients, stockGrammes, facteur);
    const possibles = personnesPossibles(recette.ingredients, stockGrammes, recette.servings);
    if (!complete && possibles < 1) continue;

    const utiliseUseSoon = recette.ingredients.some(
      (ri) => !ri.optional && ingredientsUseSoon.has(ri.ingredientId),
    );

    analyses.push({
      complete,
      possibles,
      id: recette.id,
      title: recette.title,
      cuisine: recette.cuisine,
      mealTypes: recette.mealTypes,
      prepMinutes: recette.prepMinutes,
      cookMinutes: recette.cookMinutes,
      servings: recette.servings,
      difficulty: recette.difficulty,
      tags: recette.tags,
      utiliseUseSoon,
    });
  }

  return { analyses, personnes: nbMembres };
}

/** D'abord ce qui utilise un aliment à utiliser vite, puis le plus rapide. */
function parUrgenceEtRapidite(a: SuggestionRecette, b: SuggestionRecette): number {
  if (a.utiliseUseSoon !== b.utiliseUseSoon) return a.utiliseUseSoon ? -1 : 1;
  return a.prepMinutes + a.cookMinutes - (b.prepMinutes + b.cookMinutes);
}

/** La suggestion telle que l'affichent la page et l'agent, sans les champs d'analyse. */
function versSuggestion({ complete, possibles, ...suggestion }: Analyse): SuggestionRecette {
  void complete;
  void possibles;
  return suggestion;
}

/**
 * Suggestions de recettes faisables uniquement avec le stock du foyer, pour tout le monde
 * (ou pour le nombre de personnes donné).
 */
export async function suggererRecettes(
  session: SessionVerifiee,
  // Pour un nombre de personnes donné par la famille (invités) ; sinon tout le foyer
  nbPersonnes?: number,
): Promise<SuggestionRecette[]> {
  const { analyses } = await analyserStock(session, nbPersonnes);
  return analyses
    .filter((a) => a.complete)
    .map(versSuggestion)
    .sort(parUrgenceEtRapidite);
}

export type ViderLeFrigo = {
  // Faisables pour tout le foyer
  completes: SuggestionRecette[];
  // Faisables seulement pour moins de personnes : avec ce qui reste, mieux que rien
  pourMoins: (SuggestionRecette & { personnes: number })[];
  personnesFoyer: number;
};

/** La page « Vider le frigo » : les recettes complètes, puis celles pour moins de personnes. */
export async function viderLeFrigo(session: SessionVerifiee): Promise<ViderLeFrigo> {
  const { analyses, personnes } = await analyserStock(session);
  return {
    completes: analyses
      .filter((a) => a.complete)
      .map(versSuggestion)
      .sort(parUrgenceEtRapidite),
    pourMoins: analyses
      .filter((a) => !a.complete)
      .sort((a, b) => b.possibles - a.possibles || parUrgenceEtRapidite(a, b))
      .slice(0, 6)
      .map((a) => ({ ...versSuggestion(a), personnes: a.possibles })),
    personnesFoyer: personnes,
  };
}
