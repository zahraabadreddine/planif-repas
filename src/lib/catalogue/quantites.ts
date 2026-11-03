// Affichage des quantités d'une recette en unités du marché, jamais en grammes (CLAUDE.md §12).

export type UniteAffichee = { label: string; grams: number };

const INVARIABLES = /^(c\. à|ml$|l$|g$|kg$|tas\b)/;

/** Nombre à la française : 0,5 au lieu de 0.5. */
export function nombre(valeur: number): string {
  return String(Math.round(valeur * 100) / 100).replace(".", ",");
}

/** « 2 gousses », « 3 boîtes de 400 g », « 2 morceaux » ; au-delà de 1 seulement. */
export function pluriel(label: string, quantite: number): string {
  if (quantite <= 1 || INVARIABLES.test(label)) return label;
  const [premier, ...reste] = label.split(" ");
  const accorde = /[sxz]$/.test(premier)
    ? premier
    : /eau$/.test(premier)
      ? `${premier}x`
      : `${premier}s`;
  return [accorde, ...reste].join(" ");
}

const auDemi = (valeur: number) => Math.round(valeur * 2) / 2;
const auQuart = (valeur: number) => Math.round(valeur * 4) / 4;

const enUnite = (valeur: number, unite: UniteAffichee) =>
  `≈ ${nombre(valeur)} ${pluriel(unite.label, valeur)}`;

/** Écart relatif entre la valeur arrondie et la vraie valeur. */
const ecart = (arrondi: number, vrai: number) => Math.abs(arrondi - vrai) / vrai;

/**
 * Une quantité en grammes (g, kg) est montrée dans une unité de l'ingrédient : la plus grande
 * qui tient au moins une fois (« ≈ 4 tranches »), sinon en kg à partir de 100 g (à 10 g près),
 * sinon une fraction de sa plus petite unité (« ≈ 0,5 pièce »), sinon en cuillères.
 * Un arrondi trop éloigné de la vraie quantité n'est jamais affiché.
 */
export function afficherQuantite(
  quantite: number,
  unite: UniteAffichee,
  unitesDeLIngredient: UniteAffichee[],
): string {
  if (unite.label !== "g" && unite.label !== "kg") {
    return `${nombre(quantite)} ${pluriel(unite.label, quantite)}`;
  }
  const grams = quantite * unite.grams;
  const parTaille = [...unitesDeLIngredient].sort((a, b) => b.grams - a.grams);

  const entiere = parTaille.find((u) => grams / u.grams >= 1);
  if (entiere && ecart(auDemi(grams / entiere.grams), grams / entiere.grams) <= 0.1) {
    return enUnite(auDemi(grams / entiere.grams), entiere);
  }
  if (grams >= 100) return `${nombre(Math.round(grams / 10) / 100)} kg`;

  const petite = parTaille.at(-1);
  if (petite && grams / petite.grams >= 0.2) {
    const fraction = auQuart(grams / petite.grams);
    if (ecart(fraction, grams / petite.grams) <= 0.25) return enUnite(fraction, petite);
  }
  if (grams >= 7.5) return `≈ ${nombre(auDemi(grams / 15))} c. à soupe`;
  return `≈ ${nombre(Math.max(0.25, auQuart(grams / 5)))} c. à café`;
}
