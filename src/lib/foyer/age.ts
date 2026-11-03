import type { AgeGroup } from "@prisma/client";

// Âge et tranche d'âge d'un membre, calculés à la date du jour en Côte d'Ivoire.

/** Date du jour à Abidjan au format AAAA-MM-JJ (le serveur peut être dans un autre pays). */
export function dateDuJour(maintenant = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Abidjan" }).format(maintenant);
}

/** Âge en années révolues entre une date de naissance et une date de référence (AAAA-MM-JJ). */
export function ageEnAnnees(naissance: string, aujourdhui: string): number {
  const [an, mois, jour] = naissance.split("-").map(Number);
  const [anJ, moisJ, jourJ] = aujourdhui.split("-").map(Number);
  const anniversairePasse = moisJ > mois || (moisJ === mois && jourJ >= jour);
  return anJ - an - (anniversairePasse ? 0 : 1);
}

/** Tranche d'âge : bébé 0-2 ans, enfant 3-11, ado 12-17, adulte 18-64, senior 65 et plus. */
export function trancheDAge(age: number): AgeGroup {
  if (age <= 2) return "baby";
  if (age <= 11) return "child";
  if (age <= 17) return "teen";
  if (age <= 64) return "adult";
  return "senior";
}
