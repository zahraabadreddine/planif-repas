import type { Note } from "@/lib/validation/note";

// Notation des recettes déjà passées par les filtres durs (CLAUDE.md §11, étape 2).
// Chaque critère donne une valeur entre -1 et 1, multipliée par son poids.

/** Poids des critères : plus un poids est grand, plus le critère compte. */
export const POIDS = {
  budget: 3,
  saison: 1,
  stock: 2,
  variete: 3,
  note: 2,
  cuisine: 1,
} as const;

export type Critere = keyof typeof POIDS;

/** Une recette servie dans ces derniers jours est pénalisée. */
export const JOURSVARIETE = 14;

/** Catégories qui font l'ingrédient principal d'un plat, avant les autres. */
export const CATEGORIESPRINCIPALES = [
  "viande",
  "volaille",
  "poisson",
  "fruits de mer",
  "porc",
  "légumineuse",
  "œufs",
];

export type IngredientANoter = {
  id: string;
  category: string;
  seasonalMonths: number[];
  grams: number;
  optional: boolean;
};

export type RecetteANoter = {
  id: string;
  cuisine: string;
  coutParPortionFcfa: number;
  ingredients: IngredientANoter[];
};

export type ContexteScore = {
  // Budget de la semaine divisé par le nombre de portions à servir
  budgetParPortionFcfa: number;
  // Mois de la semaine planifiée, de 1 à 12
  mois: number;
  // Ingrédients du stock à consommer vite
  aConsommerVite: Set<string>;
  // Recettes servies pendant les JOURSVARIETE derniers jours
  servieRecemment: Set<string>;
  notes: Map<string, Note>;
  cuisinesPreferees: string[];
};

export type Score = { total: number; details: Record<Critere, number> };

const borner = (valeur: number) => Math.max(-1, Math.min(1, valeur));

const utiles = (recette: RecetteANoter) => recette.ingredients.filter((i) => !i.optional);

/** Moins la portion coûte par rapport au budget, mieux c'est ; au-delà du double, -1. */
function critereBudget(recette: RecetteANoter, contexte: ContexteScore): number {
  if (contexte.budgetParPortionFcfa <= 0) return 0;
  return borner(1 - recette.coutParPortionFcfa / contexte.budgetParPortionFcfa);
}

/** Les ingrédients disponibles toute l'année ne comptent pas. */
function critereSaison(recette: RecetteANoter, contexte: ContexteScore): number {
  const saisonniers = utiles(recette).filter((i) => i.seasonalMonths.length < 12);
  if (saisonniers.length === 0) return 0;
  const enSaison = saisonniers.filter((i) => i.seasonalMonths.includes(contexte.mois)).length;
  return (2 * enSaison - saisonniers.length) / saisonniers.length;
}

function critereStock(recette: RecetteANoter, contexte: ContexteScore): number {
  return recette.ingredients.some((i) => contexte.aConsommerVite.has(i.id)) ? 1 : 0;
}

function critereVariete(recette: RecetteANoter, contexte: ContexteScore): number {
  return contexte.servieRecemment.has(recette.id) ? -1 : 0;
}

/** « J'aime » : 1, « Bof » : 0, « Je n'aime pas » : -1, jamais goûté : 0. */
function critereNote(recette: RecetteANoter, contexte: ContexteScore): number {
  const note = contexte.notes.get(recette.id);
  return note ? note - 2 : 0;
}

function critereCuisine(recette: RecetteANoter, contexte: ContexteScore): number {
  return contexte.cuisinesPreferees.includes(recette.cuisine) ? 1 : 0;
}

const CRITERES: Record<Critere, (r: RecetteANoter, c: ContexteScore) => number> = {
  budget: critereBudget,
  saison: critereSaison,
  stock: critereStock,
  variete: critereVariete,
  note: critereNote,
  cuisine: critereCuisine,
};

export function scoreRecette(recette: RecetteANoter, contexte: ContexteScore): Score {
  const details = {} as Record<Critere, number>;
  let total = 0;
  for (const critere of Object.keys(POIDS) as Critere[]) {
    details[critere] = CRITERES[critere](recette, contexte);
    total += POIDS[critere] * details[critere];
  }
  return { total, details };
}

/**
 * Ingrédient principal : le plus lourd parmi les viandes, poissons, légumineuses et œufs,
 * ou à défaut le plus lourd de la recette. Sert à ne pas le servir deux fois dans la semaine.
 */
export function ingredientPrincipal(recette: RecetteANoter): string | null {
  const lignes = utiles(recette);
  const principales = lignes.filter((i) => CATEGORIESPRINCIPALES.includes(i.category));
  const candidates = principales.length > 0 ? principales : lignes;
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => (b.grams > a.grams ? b : a)).id;
}

/** Recettes de la meilleure à la moins bonne ; à égalité, l'ordre d'origine est gardé. */
export function classer<T extends RecetteANoter>(
  recettes: T[],
  contexte: ContexteScore,
): (T & { score: Score })[] {
  return recettes
    .map((recette) => ({ ...recette, score: scoreRecette(recette, contexte) }))
    .sort((a, b) => b.score.total - a.score.total);
}
