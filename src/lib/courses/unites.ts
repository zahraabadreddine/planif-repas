import type { UniteAffichee } from "@/lib/catalogue/quantites";

// Conversion d'un poids en unités du marché pour la liste de courses (CLAUDE.md §11).
// Au marché on n'achète pas 2,8 tas : on arrondit toujours à l'unité supérieure.

// Tolérance pour les erreurs d'arrondi des nombres à virgule (1000 g / 500 g = 2,0000001)
const TOLERANCE = 1e-9;

/** Nombre d'unités à acheter pour couvrir ce poids : 1 400 g avec un tas de 500 g donne 3 tas. */
export function unitesAAcheter(grams: number, unite: UniteAffichee): number {
  if (grams <= 0 || unite.grams <= 0) return 0;
  return Math.ceil(grams / unite.grams - TOLERANCE);
}
