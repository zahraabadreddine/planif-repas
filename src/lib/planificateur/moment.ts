import type { MealSlot } from "@prisma/client";

// Le repas « du moment » pour le mode urgence, à l'heure d'Abidjan (le pilote s'y déroule).

/** À partir de midi, c'est le déjeuner ; à partir de 17 h, on prépare déjà le dîner. */
export const HEUREDEJEUNER = 12;
export const HEUREDINER = 17;

/** Heure (0 à 23) à Abidjan, quel que soit le pays du serveur. */
export function heureAbidjan(maintenant = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Abidjan",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(maintenant),
  );
}

/** Avant 12 h : petit déjeuner. De 12 h à 17 h : déjeuner. Ensuite : dîner. */
export function creneauDuMoment(maintenant = new Date()): MealSlot {
  const heure = heureAbidjan(maintenant);
  if (heure < HEUREDEJEUNER) return "breakfast";
  return heure < HEUREDINER ? "lunch" : "dinner";
}

/** Comment la famille dit le moment : « ce midi », « demain soir »… */
export const MOMENTS: Record<MealSlot, { ce: string; demain: string }> = {
  breakfast: { ce: "ce matin", demain: "demain matin" },
  lunch: { ce: "ce midi", demain: "demain midi" },
  dinner: { ce: "ce soir", demain: "demain soir" },
};
