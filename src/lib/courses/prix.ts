import type { PriceSource } from "@prisma/client";

// Prix retenu d'un ingrédient pour une ville et un type de lieu (CLAUDE.md §11).
// Les relevés peuvent être dans des unités différentes (kg, tas, boîte…) :
// on les compare toujours ramenés au kilogramme.

export type Releve = {
  priceFcfa: number;
  // Poids de l'unité du relevé, en grammes (1 kg = 1000)
  grams: number;
  source: PriceSource;
  observedAt: Date;
};

export type PrixRetenu = {
  fcfaParKg: number;
  // « releve » : prix réellement observé ; « estimation » : estimation de l'équipe
  nature: "releve" | "estimation";
  // Date du relevé le plus récent pris en compte
  date: Date;
};

/** Seuls les relevés des 90 derniers jours comptent. */
export const FENETREJOURS = 90;
/** En dessous de 3 relevés d'utilisatrices, les relevés de l'équipe passent en priorité. */
export const MINIMUMRELEVESUTILISATRICES = 3;

const unJour = 24 * 60 * 60 * 1000;

const parKg = (releve: Releve) => (releve.priceFcfa / releve.grams) * 1000;

export function mediane(valeurs: number[]): number {
  const triees = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(triees.length / 2);
  return triees.length % 2 ? triees[milieu] : (triees[milieu - 1] + triees[milieu]) / 2;
}

const plusRecent = (releves: Releve[]) =>
  new Date(Math.max(...releves.map((r) => r.observedAt.getTime())));

/** Prix retenu, ou null si aucun relevé ni estimation : « prix inconnu ». */
export function prixRetenu(releves: Releve[], maintenant: Date): PrixRetenu | null {
  const limite = maintenant.getTime() - FENETREJOURS * unJour;
  const recents = releves.filter(
    (r) => r.source !== "estimate" && r.observedAt.getTime() >= limite && r.grams > 0,
  );
  const utilisatrices = recents.filter((r) => r.source === "user");
  const equipe = recents.filter((r) => r.source === "team");
  const retenus =
    utilisatrices.length >= MINIMUMRELEVESUTILISATRICES || equipe.length === 0
      ? utilisatrices
      : equipe;

  if (retenus.length > 0) {
    return {
      fcfaParKg: Math.round(mediane(retenus.map(parKg))),
      nature: "releve",
      date: plusRecent(retenus),
    };
  }

  // Sans relevé récent : l'estimation la plus récente de l'équipe, affichée comme telle.
  const estimations = releves.filter((r) => r.source === "estimate" && r.grams > 0);
  if (estimations.length === 0) return null;
  const derniere = estimations.reduce((a, b) => (b.observedAt > a.observedAt ? b : a));
  return {
    fcfaParKg: Math.round(parKg(derniere)),
    nature: "estimation",
    date: derniere.observedAt,
  };
}
