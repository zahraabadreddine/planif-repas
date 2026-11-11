import type { MealSlot } from "@prisma/client";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { suggererRecettes, type SuggestionRecette } from "@/lib/stock/vider-frigo";

// Mode urgence (EF-17) : « pas le temps, qu'est-ce que je peux faire vite ? »
// Filtre les recettes faisables avec le stock par temps total (règle 3 : calcul par le code).

export type OptionUrgence = SuggestionRecette & {
  totalMinutes: number;
};

export async function suggestionsUrgence(
  session: SessionVerifiee,
  maxMinutes: number,
  nbPersonnes?: number,
  // Le repas du moment : on ne propose pas une sauce graine au petit déjeuner
  creneau: MealSlot = "dinner",
): Promise<OptionUrgence[]> {
  void nbPersonnes;

  const toutes = await suggererRecettes(session);

  const filtrees = toutes
    .map((r) => ({
      ...r,
      totalMinutes: r.prepMinutes + r.cookMinutes,
    }))
    // Le plat d'urgence remplace le repas du moment (petit déjeuner, déjeuner ou dîner)
    .filter((r) => r.totalMinutes <= maxMinutes && r.mealTypes.includes(creneau))
    .sort((a, b) => {
      if (a.utiliseUseSoon !== b.utiliseUseSoon) return a.utiliseUseSoon ? -1 : 1;
      return a.totalMinutes - b.totalMinutes;
    });

  return filtrees.slice(0, 3);
}
