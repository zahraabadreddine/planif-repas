import { ALLERGENES, REGIMES, normaliser } from "@/lib/validation/membre";

// Filtres durs (CLAUDE.md §11, règle 2) : une recette qui contient un allergène ou ne respecte
// pas le régime d'un membre est écartée par le code, jamais par une simple consigne à l'IA.

export type IngredientAFiltrer = {
  name: string;
  category: string;
  allergens: string[];
};

export type RestrictionAFiltrer = {
  // Surnom du membre, pour l'affichage dans l'app seulement
  membre: string;
  type: "allergy" | "diet";
  value: string;
};

export type Incompatibilite = { membre: string; raison: string };

/** Catégories d'ingrédients écartées par chaque régime. */
export const CATEGORIESINTERDITES: Record<string, string[]> = {
  vegetarien: ["viande", "volaille", "poisson", "fruits de mer", "porc"],
  "sans-porc": ["porc"],
};

const allergenesConnus = new Map<string, string>(ALLERGENES.map((a) => [a.valeur, a.libelle]));
const libellesRegimes = new Map<string, string>(REGIMES.map((r) => [r.valeur, r.libelle]));

function viole(restriction: RestrictionAFiltrer, ingredient: IngredientAFiltrer): boolean {
  if (restriction.type === "diet") {
    return (CATEGORIESINTERDITES[restriction.value] ?? []).includes(ingredient.category);
  }
  if (allergenesConnus.has(restriction.value)) {
    return ingredient.allergens.includes(restriction.value);
  }
  // Autre allergie : un ingrédient du catalogue ou un aliment, cherché dans le nom de l'ingrédient
  return normaliser(ingredient.name).includes(normaliser(restriction.value));
}

function raison(restriction: RestrictionAFiltrer): string {
  if (restriction.type === "diet")
    return libellesRegimes.get(restriction.value) ?? restriction.value;
  return (allergenesConnus.get(restriction.value) ?? restriction.value).toLowerCase();
}

/**
 * Raisons pour lesquelles une recette ne convient pas au foyer (liste vide : elle convient).
 * Les ingrédients facultatifs comptent aussi : c'est plus sûr.
 */
export function incompatibilites(
  ingredients: IngredientAFiltrer[],
  restrictions: RestrictionAFiltrer[],
): Incompatibilite[] {
  const trouvees: Incompatibilite[] = [];
  for (const restriction of restrictions) {
    if (ingredients.some((ingredient) => viole(restriction, ingredient))) {
      trouvees.push({ membre: restriction.membre, raison: raison(restriction) });
    }
  }
  return trouvees;
}
