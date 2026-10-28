import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { chargerRecettes } from "@/lib/catalogue/recettes";
import { genererListe, type ListeEnregistree } from "@/lib/courses/generation";
import { listerMembres } from "@/lib/foyer/membres";
import {
  cuisineEnDouble,
  type Candidat,
  type MenuCompose,
  type ParametresComposition,
  type RepasCompose,
} from "./composition";
import { equipementManquant, incompatibilites, restrictionsDuFoyer } from "./filtres";
import {
  avecRepas,
  chargerContexte,
  exigerFoyer,
  ingredientsAFiltrer,
  versCandidate,
  versMenu,
  type MenuEnregistre,
} from "./generation";
import { verifierMenu, type CodeProbleme, type RecetteAVerifier } from "./verification";

// Remplacement d'un repas du menu (EF-06). L'utilisatrice choisit, le code revérifie
// allergies, régimes, créneau, temps et budget avant d'enregistrer (règles 1 et 2).

export type RepasRemplace = { menu: MenuEnregistre; liste: ListeEnregistree | null };

type RepasPlan = {
  id: string;
  recipeId: string;
  date: Date;
  slot: "breakfast" | "lunch" | "dinner";
  servings: number;
  leftoverFromId: string | null;
};

type Modification = {
  id: string;
  recipeId: string;
  servings: number;
  leftoverFromId: string | null;
};

const MSPARJOUR = 24 * 60 * 60 * 1000;

/** Reste d'un dîner : tout repas qui pointe vers lui. */
const resteDuDiner = (repas: RepasPlan[], dinerId: string) =>
  repas.find((r) => r.leftoverFromId === dinerId);

/** Repas du plan, ordonnés par jour puis déjeuner avant dîner. */
function ordonner(repas: RepasPlan[]): RepasPlan[] {
  return [...repas].sort(
    (a, b) => a.date.getTime() - b.date.getTime() || (a.slot === "lunch" ? -1 : 1),
  );
}

/**
 * Repas modifiés par le remplacement : le repas choisi et, selon le cas,
 * le reste du lendemain ou le dîner de la veille.
 */
function appliquerRemplacement(
  repas: RepasPlan[],
  cible: RepasPlan,
  recette: Candidat,
  personnes: number,
): Modification[] {
  const reste = resteDuDiner(repas, cible.id);
  if (reste) {
    const jour = Math.round((cible.date.getTime() - repas[0].date.getTime()) / MSPARJOUR);
    if (cuisineEnDouble(recette, jour)) {
      return [
        { id: cible.id, recipeId: recette.id, servings: cible.servings, leftoverFromId: null },
        { id: reste.id, recipeId: recette.id, servings: reste.servings, leftoverFromId: cible.id },
      ];
    }
    // La nouvelle recette ne se mange pas à midi : le reste devient un déjeuner ordinaire
    return [
      { id: cible.id, recipeId: recette.id, servings: personnes, leftoverFromId: null },
      { id: reste.id, recipeId: reste.recipeId, servings: personnes, leftoverFromId: null },
    ];
  }
  if (cible.leftoverFromId) {
    // Le dîner d'origine n'est plus cuisiné en double
    const diner = repas.find((r) => r.id === cible.leftoverFromId);
    return [
      { id: cible.id, recipeId: recette.id, servings: personnes, leftoverFromId: null },
      ...(diner
        ? [{ id: diner.id, recipeId: diner.recipeId, servings: personnes, leftoverFromId: null }]
        : []),
    ];
  }
  return [{ id: cible.id, recipeId: recette.id, servings: cible.servings, leftoverFromId: null }];
}

function versMenuCompose(
  repas: RepasPlan[],
  modifications: Modification[],
  recettes: Map<string, RecetteAVerifier>,
): MenuCompose {
  const apres = ordonner(repas).map((r) => ({
    ...r,
    ...(modifications.find((m) => m.id === r.id) ?? {}),
  }));
  const composes: RepasCompose[] = apres.map((r) => {
    const reste = r.leftoverFromId !== null;
    return {
      jour: Math.round((r.date.getTime() - apres[0].date.getTime()) / MSPARJOUR),
      slot: r.slot === "lunch" ? "lunch" : "dinner",
      recetteId: r.recipeId,
      portions: r.servings,
      resteDe: reste ? apres.findIndex((d) => d.id === r.leftoverFromId) : null,
      coutFcfa: reste ? 0 : (recettes.get(r.recipeId)?.coutParPortionFcfa ?? 0) * r.servings,
    };
  });
  return {
    repas: composes,
    totalFcfa: composes.reduce((total, r) => total + r.coutFcfa, 0),
    principauxRepetes: [],
  };
}

function codeApi(codes: CodeProbleme[]): "REPASINCOMPATIBLE" | "BUDGETDEPASSE" | "ERREURSERVEUR" {
  if (codes.every((c) => c === "BUDGETDEPASSE")) return "BUDGETDEPASSE";
  const recette: CodeProbleme[] = ["INCOMPATIBLE", "CRENEAU", "TEMPSDEPASSE", "RECETTEREPETEE"];
  return codes.every((c) => recette.includes(c) || c === "BUDGETDEPASSE")
    ? "REPASINCOMPATIBLE"
    : "ERREURSERVEUR";
}

/** Remplace la recette d'un repas du menu ; la liste de courses est refaite si le menu est actif. */
export async function remplacerRepas(
  session: SessionVerifiee,
  repasId: string,
  recetteId: string,
): Promise<RepasRemplace> {
  const householdId = exigerFoyer(session);
  const cible = await prisma.plannedMeal.findFirst({
    where: { id: repasId, mealPlan: { householdId } },
    include: { mealPlan: { include: { meals: true } } },
  });
  if (!cible) throw new ErreurApi("INTROUVABLE");
  const plan = cible.mealPlan;
  if (plan.status === "archived") throw new ErreurApi("MENUARCHIVE");

  const [catalogue, membres, contexte] = await Promise.all([
    chargerRecettes(),
    listerMembres(session),
    chargerContexte(householdId, plan.weekStart),
  ]);
  const nouvelle = catalogue.find((r) => r.id === recetteId);
  if (!nouvelle) throw new ErreurApi("INTROUVABLE");

  const restrictions = restrictionsDuFoyer(membres);
  if (
    incompatibilites(ingredientsAFiltrer(nouvelle), restrictions).length > 0 ||
    equipementManquant(nouvelle.tags, contexte.equipement).length > 0
  ) {
    throw new ErreurApi("REPASINCOMPATIBLE");
  }

  const maintenant = new Date();
  const candidates = catalogue.map((r) => versCandidate(r, maintenant));
  const repas = ordonner(plan.meals);
  const personnes = Math.max(1, membres.length);
  const candidate = candidates.find((c) => c.id === recetteId);
  if (!candidate) throw new ErreurApi("ERREURSERVEUR");

  const modifications = appliquerRemplacement(repas, cible, candidate, personnes);
  const parametres: ParametresComposition = {
    personnes,
    weekStart: plan.weekStart,
    budgetFcfa: contexte.budgetFcfa,
  };
  const menu = versMenuCompose(repas, modifications, new Map(candidates.map((c) => [c.id, c])));
  const problemes = verifierMenu(menu, candidates, restrictions, parametres);
  if (problemes.length > 0) throw new ErreurApi(codeApi(problemes.map((p) => p.code)));

  await prisma.$transaction([
    ...modifications.map((m) =>
      prisma.plannedMeal.update({
        where: { id: m.id },
        data: { recipeId: m.recipeId, servings: m.servings, leftoverFromId: m.leftoverFromId },
      }),
    ),
    prisma.mealPlan.update({
      where: { id: plan.id },
      data: { estimatedCostFcfa: menu.totalFcfa },
    }),
  ]);

  const liste = plan.status === "active" ? await genererListe(session, plan.id) : null;
  const enregistre = await prisma.mealPlan.findFirst({
    where: { id: plan.id, householdId },
    include: avecRepas,
  });
  if (!enregistre) throw new ErreurApi("ERREURSERVEUR");
  return { menu: versMenu(enregistre), liste };
}
