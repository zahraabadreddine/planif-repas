// Unités proposées pour déclarer un achat (EF-13) : celles du marché propres à l'ingrédient
// (tas, morceau, sachet…), plus le kg pour ce qui s'achète au poids. Jamais le gramme ni le ml :
// la famille parle en unités du marché (CLAUDE.md §12).

export type UniteAchat = { id: string; label: string; grams: number };

/** « 1 tas ≈ 250 g », « 1 sachet ≈ 1,5 kg » ; rien pour le kg lui-même. */
export function equivalence(unite: UniteAchat): string | null {
  if (unite.label === "kg" || unite.grams <= 0) return null;
  const poids =
    unite.grams >= 1000
      ? `${(unite.grams / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} kg`
      : `${Math.round(unite.grams)} g`;
  return `1 ${unite.label} ≈ ${poids}`;
}

/** Unités de l'ingrédient, puis le kg s'il n'en a pas déjà un. */
export function unitesAchat(propres: UniteAchat[], kg: UniteAchat | null): UniteAchat[] {
  const unites = [...propres].sort((a, b) => a.label.localeCompare(b.label, "fr"));
  if (kg && !unites.some((u) => u.label === "kg" || u.id === kg.id)) unites.push(kg);
  return unites;
}
