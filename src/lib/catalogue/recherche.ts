import type { Incompatibilite } from "@/lib/planificateur/filtres";
import type { Filtres } from "@/lib/validation/catalogue";
import { normaliser } from "@/lib/validation/membre";
import type { CoutRecette } from "./cout";

// Recherche et filtres du catalogue (EF-20), sans accès à la base.

export type RecetteResume = {
  id: string;
  title: string;
  cuisine: string;
  minutes: number;
  difficulty: number;
  servings: number;
  tags: string[];
  ingredients: string[];
  cout: CoutRecette;
  incompatibilites: Incompatibilite[];
};

/** Tous les mots tapés doivent se retrouver dans le titre, les mots-clés ou les ingrédients. */
export function correspondAuTexte(recette: RecetteResume, texte: string): boolean {
  const mots = normaliser(texte).split(" ").filter(Boolean);
  const cible = normaliser([recette.title, ...recette.tags, ...recette.ingredients].join(" "));
  return mots.every((mot) => cible.includes(mot));
}

export function correspond(recette: RecetteResume, filtres: Filtres): boolean {
  if (filtres.q && !correspondAuTexte(recette, filtres.q)) return false;
  if (filtres.cuisine && recette.cuisine !== filtres.cuisine) return false;
  if (filtres.temps && recette.minutes > filtres.temps) return false;
  if (filtres.cout && recette.cout.totalFcfa > filtres.cout) return false;
  return true;
}

/** Applique les filtres ; les recettes qui ne conviennent pas au foyer sont masquées par défaut. */
export function filtrerCatalogue(recettes: RecetteResume[], filtres: Filtres) {
  const correspondantes = recettes.filter((recette) => correspond(recette, filtres));
  const compatibles = correspondantes.filter((r) => r.incompatibilites.length === 0);
  return {
    recettes: filtres.tout ? correspondantes : compatibles,
    masquees: correspondantes.length - compatibles.length,
  };
}
