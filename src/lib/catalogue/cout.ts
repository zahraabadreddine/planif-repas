import type { PlaceType } from "@prisma/client";
import { prixRetenu, type PrixRetenu, type Releve } from "@/lib/courses/prix";

// Coût estimé d'une recette (règle 3 : calculé par le code, jamais par l'IA).

export type ReleveDuLieu = Releve & { placeType: PlaceType };

export type LignePourCout = {
  ingredient: string;
  grams: number;
  optional: boolean;
  releves: ReleveDuLieu[];
};

export type CoutRecette = {
  totalFcfa: number;
  parPersonneFcfa: number;
  // Nombre d'ingrédients chiffrés avec un prix relevé, ou seulement estimé
  avecReleve: number;
  avecEstimation: number;
  // Ingrédients sans aucun prix, exclus du total
  sansPrix: string[];
};

/** Prix le plus avantageux parmi les lieux ; un prix relevé passe toujours avant une estimation. */
export function meilleurPrix(releves: ReleveDuLieu[], maintenant: Date): PrixRetenu | null {
  const lieux = [...new Set(releves.map((r) => r.placeType))];
  const parLieu = lieux
    .map((lieu) =>
      prixRetenu(
        releves.filter((r) => r.placeType === lieu),
        maintenant,
      ),
    )
    .filter((prix): prix is PrixRetenu => prix !== null);
  const reels = parLieu.filter((prix) => prix.nature === "releve");
  const candidats = reels.length > 0 ? reels : parLieu;
  if (candidats.length === 0) return null;
  return candidats.reduce((a, b) => (b.fcfaParKg < a.fcfaParKg ? b : a));
}

/** Les ingrédients facultatifs ne comptent pas dans le coût. Montants en FCFA entiers. */
export function coutRecette(
  lignes: LignePourCout[],
  servings: number,
  maintenant: Date,
): CoutRecette {
  let total = 0;
  let avecReleve = 0;
  let avecEstimation = 0;
  const sansPrix: string[] = [];
  for (const ligne of lignes.filter((l) => !l.optional)) {
    const prix = meilleurPrix(ligne.releves, maintenant);
    if (!prix) {
      sansPrix.push(ligne.ingredient);
      continue;
    }
    total += (ligne.grams / 1000) * prix.fcfaParKg;
    if (prix.nature === "releve") avecReleve += 1;
    else avecEstimation += 1;
  }
  return {
    totalFcfa: Math.round(total),
    parPersonneFcfa: Math.round(total / Math.max(1, servings)),
    avecReleve,
    avecEstimation,
    sansPrix,
  };
}
