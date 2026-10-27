import type { MealSlot } from "@prisma/client";

// Composition du menu de la semaine (CLAUDE.md §11, étape 3), faite par le code tant que l'agent
// n'est pas branché. Les candidates ont déjà passé les filtres durs et sont classées par score.

/** Un dîner de semaine (lundi à vendredi) ne dépasse pas ce temps, préparation et cuisson comprises. */
export const TEMPSMAXSOIRSEMAINE = 60;

export const JOURSSEMAINE = 7;

/** Déjeuner et dîner des 7 jours. */
const CRENEAUX = JOURSSEMAINE * 2;

export type Candidat = {
  id: string;
  mealTypes: MealSlot[];
  // Préparation et cuisson, en minutes
  minutes: number;
  coutParPortionFcfa: number;
  principal: string | null;
};

export type ParametresComposition = {
  personnes: number;
  // Lundi de la semaine, à minuit UTC (date sans heure)
  weekStart: Date;
  budgetFcfa: number;
};

export type RepasCompose = {
  // 0 pour le jour de weekStart, jusqu'à 6
  jour: number;
  slot: "lunch" | "dinner";
  recetteId: string;
  portions: number;
  // Indice, dans la liste des repas, du dîner dont ce déjeuner est le reste
  resteDe: number | null;
  // 0 pour un reste : il est déjà compté dans le dîner cuisiné en double
  coutFcfa: number;
};

export type MenuCompose = {
  repas: RepasCompose[];
  totalFcfa: number;
  // Ingrédients principaux servis deux fois faute d'assez de recettes
  principauxRepetes: string[];
};

export type ResultatComposition =
  | { ok: true; menu: MenuCompose }
  | { ok: false; code: "BUDGETINSUFFISANT" | "RECETTESINSUFFISANTES" };

/** Lundi à vendredi. */
export function estJourDeSemaine(weekStart: Date, jour: number): boolean {
  const date = new Date(weekStart);
  date.setUTCDate(date.getUTCDate() + jour);
  const jourSemaine = date.getUTCDay();
  return jourSemaine >= 1 && jourSemaine <= 5;
}

/** Le dîner d'un jour qui a un lendemain dans la semaine est cuisiné en double s'il se mange à midi. */
export function cuisineEnDouble(candidat: Candidat, jour: number): boolean {
  return jour < JOURSSEMAINE - 1 && candidat.mealTypes.includes("lunch");
}

function convient(
  candidat: Candidat,
  slot: RepasCompose["slot"],
  jour: number,
  parametres: ParametresComposition,
): boolean {
  if (!candidat.mealTypes.includes(slot)) return false;
  if (slot === "dinner" && estJourDeSemaine(parametres.weekStart, jour)) {
    return candidat.minutes <= TEMPSMAXSOIRSEMAINE;
  }
  return true;
}

/**
 * Remplit les 14 créneaux dans l'ordre des candidates. Avec `limiterBudget`, une recette est écartée
 * si, même en finissant la semaine avec la recette la moins chère, le budget serait dépassé.
 * Renvoie null s'il manque une recette pour un créneau.
 */
function remplir(
  ordre: Candidat[],
  parametres: ParametresComposition,
  limiterBudget: boolean,
): MenuCompose | null {
  if (ordre.length === 0) return null;
  const { personnes, budgetFcfa } = parametres;
  const moinsChere = Math.min(...ordre.map((c) => c.coutParPortionFcfa));
  const repas: RepasCompose[] = [];
  const cuisinees = new Set<string>();
  const principaux = new Set<string>();
  const principauxRepetes: string[] = [];
  let totalFcfa = 0;
  let creneauxCouverts = 0;

  const choisir = (slot: RepasCompose["slot"], jour: number): Candidat | null => {
    for (const repetitionPermise of [false, true]) {
      for (const candidat of ordre) {
        if (cuisinees.has(candidat.id) || !convient(candidat, slot, jour, parametres)) continue;
        const repete = candidat.principal !== null && principaux.has(candidat.principal);
        if (repete && !repetitionPermise) continue;
        const couverts = slot === "dinner" && cuisineEnDouble(candidat, jour) ? 2 : 1;
        const cout = candidat.coutParPortionFcfa * personnes * couverts;
        const minimumRestant = (CRENEAUX - creneauxCouverts - couverts) * personnes * moinsChere;
        if (limiterBudget && totalFcfa + cout + minimumRestant > budgetFcfa) continue;
        return candidat;
      }
    }
    return null;
  };

  const ajouter = (candidat: Candidat, slot: RepasCompose["slot"], jour: number) => {
    const couverts = slot === "dinner" && cuisineEnDouble(candidat, jour) ? 2 : 1;
    const coutFcfa = candidat.coutParPortionFcfa * personnes * couverts;
    if (candidat.principal !== null) {
      if (principaux.has(candidat.principal)) principauxRepetes.push(candidat.principal);
      principaux.add(candidat.principal);
    }
    cuisinees.add(candidat.id);
    repas.push({
      jour,
      slot,
      recetteId: candidat.id,
      portions: personnes * couverts,
      resteDe: null,
      coutFcfa,
    });
    totalFcfa += coutFcfa;
    creneauxCouverts += couverts;
  };

  for (let jour = 0; jour < JOURSSEMAINE; jour++) {
    const veille = repas.at(-1);
    if (veille && veille.slot === "dinner" && veille.portions > personnes) {
      repas.push({
        jour,
        slot: "lunch",
        recetteId: veille.recetteId,
        portions: personnes,
        resteDe: repas.length - 1,
        coutFcfa: 0,
      });
    } else {
      const dejeuner = choisir("lunch", jour);
      if (!dejeuner) return null;
      ajouter(dejeuner, "lunch", jour);
    }
    const diner = choisir("dinner", jour);
    if (!diner) return null;
    ajouter(diner, "dinner", jour);
  }
  return { repas, totalFcfa, principauxRepetes };
}

/**
 * Menu des meilleures recettes qui tient dans le budget. Si ce n'est pas possible, menu des
 * recettes les moins chères ; s'il dépasse encore le budget, BUDGETINSUFFISANT.
 */
export function composerMenu(
  candidats: Candidat[],
  parametres: ParametresComposition,
): ResultatComposition {
  const parScore = remplir(candidats, parametres, true);
  if (parScore && parScore.totalFcfa <= parametres.budgetFcfa) return { ok: true, menu: parScore };
  const parCout = [...candidats].sort((a, b) => a.coutParPortionFcfa - b.coutParPortionFcfa);
  const moinsCher = remplir(parCout, parametres, false);
  if (!moinsCher) return { ok: false, code: "RECETTESINSUFFISANTES" };
  if (moinsCher.totalFcfa > parametres.budgetFcfa) return { ok: false, code: "BUDGETINSUFFISANT" };
  return { ok: true, menu: moinsCher };
}
