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

const ORDRECRENEAUX: MealSlot[] = ["breakfast", "lunch", "dinner"];
const PARTIEDUJOUR: Record<MealSlot, string> = {
  breakfast: "matin",
  lunch: "midi",
  dinner: "soir",
};
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Date à Abidjan au format AAAA-MM-JJ, quel que soit le pays du serveur ou du téléphone. */
function dateAbidjan(maintenant: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Abidjan" }).format(maintenant);
}

/**
 * Un repas ne se marque « cuisiné » qu'une fois son moment arrivé : un jour passé, ou
 * aujourd'hui à partir de son heure (le dîner dès 17 h). Jamais un repas à venir, qui
 * retirerait du stock des ingrédients encore dans la cuisine.
 */
export function repasArrive(date: string, creneau: MealSlot, maintenant = new Date()): boolean {
  const aujourdhui = dateAbidjan(maintenant);
  if (date !== aujourdhui) return date < aujourdhui;
  return ORDRECRENEAUX.indexOf(creneau) <= ORDRECRENEAUX.indexOf(creneauDuMoment(maintenant));
}

/** Quand ce repas à venir pourra être marqué cuisiné : « à partir de 17 h », « vendredi soir ». */
export function quandCuisiner(date: string, creneau: MealSlot, maintenant = new Date()): string {
  const aujourdhui = dateAbidjan(maintenant);
  if (date === aujourdhui) {
    return creneau === "lunch" ? `à partir de ${HEUREDEJEUNER} h` : `à partir de ${HEUREDINER} h`;
  }
  const demain = dateAbidjan(new Date(maintenant.getTime() + 24 * 3600 * 1000));
  if (date === demain) return MOMENTS[creneau].demain;
  const jour = JOURS[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return `${jour} ${PARTIEDUJOUR[creneau]}`;
}
