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
import {
  NOUVEAUREPAS,
  changerPortionsRepas,
  decalerDejeuners,
  decalerDiners,
  echangerRepas,
  versMenuVerifiable,
  type Creneau,
  type RepasPlace,
} from "./reorganisation";
import {
  verifierMenu,
  type CodeProbleme,
  type Probleme,
  type RecetteAVerifier,
} from "./verification";
import { dateDuJour } from "@/lib/foyer/age";
import { dateSansHeure } from "@/lib/validation/menu";
import type { MealSlot } from "@prisma/client";
import { JOURSSEMAINE } from "./composition";
import { MOMENTS, creneauDuMoment } from "./moment";

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
  status?: "planned" | "cooked" | "skipped" | "replaced";
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
  weekStart: Date,
): MenuCompose {
  const apres = ordonner(repas).map((r) => ({
    ...r,
    ...(modifications.find((m) => m.id === r.id) ?? {}),
  }));
  const composes: RepasCompose[] = apres.map((r) => {
    const reste = r.leftoverFromId !== null;
    return {
      jour: Math.round((r.date.getTime() - weekStart.getTime()) / MSPARJOUR),
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
/**
 * Repas de la semaine ordinaire (midi et soir). Les plats d'un repas de fête ont leur propre
 * vérification et leur budget, et un petit déjeuner ajouté en urgence est hors du menu prévu :
 * la semaine (temps, budget, recettes répétées, décalages) les met de côté et n'y touche jamais.
 */
export function repasDeLaSemaine<T extends { course?: string | null; slot?: string }>(
  repas: T[],
): T[] {
  return repas.filter((r) => !r.course && r.slot !== "breakfast");
}

const PLATDEFETE = "Un plat du repas de fête se change avec Umi, dans le menu de fête.";
const PETITDEJEUNER = "Le petit déjeuner d'urgence ne se modifie pas : relance le mode urgence.";

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
  if (cible.status && cible.status !== "planned") {
    throw new ErreurApi("REPASINCOMPATIBLE", "Un repas déjà cuisiné ne peut plus être remplacé.");
  }
  if (cible.course) throw new ErreurApi("REPASINCOMPATIBLE", PLATDEFETE);
  if (cible.slot === "breakfast") throw new ErreurApi("REPASINCOMPATIBLE", PETITDEJEUNER);

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
  const repas = ordonner(repasDeLaSemaine(plan.meals));
  const personnes = Math.max(1, membres.length);
  const candidate = candidates.find((c) => c.id === recetteId);
  if (!candidate) throw new ErreurApi("ERREURSERVEUR");

  const modifications = appliquerRemplacement(repas, cible, candidate, personnes);
  const parametres: ParametresComposition = {
    personnes,
    weekStart: plan.weekStart,
    budgetFcfa: contexte.budgetFcfa,
  };
  const menu = versMenuCompose(
    repas,
    modifications,
    new Map(candidates.map((c) => [c.id, c])),
    plan.weekStart,
  );
  // Des portions ont pu être changées par la famille (invités) : elles restent acceptées
  const problemes = verifierMenu(menu, candidates, restrictions, parametres, {
    portionsLibres: true,
  });
  if (problemes.length > 0) {
    const code = codeApi(problemes.map((p) => p.code));
    // La famille sait pourquoi : « Le dîner du jour 2 prend plus de 60 minutes. »
    const message =
      code === "REPASINCOMPATIBLE"
        ? problemes.find((p) => p.code !== "BUDGETDEPASSE")?.message
        : undefined;
    throw new ErreurApi(code, message);
  }

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

// ---------------------------------------------------------------------------
// Réorganisation demandée par la famille (EF-07, mode urgence) : déplacer ou échanger un repas,
// changer les portions, décaler les dîners. Le code calcule la nouvelle semaine puis la revérifie
// entièrement (allergies, temps du soir, créneaux, restes, budget) avant d'enregistrer (règle 1).
// ---------------------------------------------------------------------------

type PlanAModifier = {
  id: string;
  weekStart: Date;
  status: "draft" | "active" | "archived";
  meals: RepasPlan[];
};

const jourDuMenu = (plan: PlanAModifier, date: Date) =>
  Math.round((date.getTime() - plan.weekStart.getTime()) / MSPARJOUR);

const dateDuMenu = (plan: PlanAModifier, jour: number) =>
  new Date(plan.weekStart.getTime() + jour * MSPARJOUR);

function versPlaces(plan: PlanAModifier): RepasPlace[] {
  return plan.meals.map((r) => ({
    id: r.id,
    recipeId: r.recipeId,
    jour: jourDuMenu(plan, r.date),
    slot: r.slot,
    servings: r.servings,
    leftoverFromId: r.leftoverFromId,
  }));
}

/** Ce qu'il faut pour revérifier une semaine modifiée : catalogue, restrictions, budget. */
async function chargerPourModifier(session: SessionVerifiee, plan: PlanAModifier) {
  const householdId = exigerFoyer(session);
  if (plan.status === "archived") throw new ErreurApi("MENUARCHIVE");
  const [catalogue, membres, contexte] = await Promise.all([
    chargerRecettes(),
    listerMembres(session),
    chargerContexte(householdId, plan.weekStart),
  ]);
  const maintenant = new Date();
  const parametres: ParametresComposition = {
    personnes: Math.max(1, membres.length),
    weekStart: plan.weekStart,
    budgetFcfa: contexte.budgetFcfa,
  };
  return {
    catalogue,
    candidates: catalogue.map((r) => versCandidate(r, maintenant)),
    restrictions: restrictionsDuFoyer(membres),
    equipement: contexte.equipement,
    parametres,
  };
}

type Verification = Awaited<ReturnType<typeof chargerPourModifier>>;

/** Erreur lisible pour la famille : le premier problème trouvé par la vérification. */
function erreurDeVerification(problemes: Probleme[]): ErreurApi {
  if (problemes.every((p) => p.code === "BUDGETDEPASSE")) return new ErreurApi("BUDGETDEPASSE");
  const probleme = problemes.find((p) => p.code !== "BUDGETDEPASSE") ?? problemes[0];
  return new ErreurApi("REPASINCOMPATIBLE", probleme.message);
}

/** Revérifie toute la semaine ; renvoie le menu vérifié ou lève une erreur claire. */
function verifierSemaine(places: RepasPlace[], verif: Verification): MenuCompose {
  const couts = new Map(verif.candidates.map((c) => [c.id, c.coutParPortionFcfa]));
  const menu = versMenuVerifiable(places, (id) => couts.get(id) ?? 0);
  const problemes = verifierMenu(menu, verif.candidates, verif.restrictions, verif.parametres, {
    portionsLibres: true,
  });
  if (problemes.length > 0) throw erreurDeVerification(problemes);
  return menu;
}

/** Enregistre la nouvelle semaine en une transaction : seuls les repas changés sont écrits. */
async function enregistrerSemaine(
  plan: PlanAModifier,
  avant: RepasPlace[],
  apres: RepasPlace[],
  retires: string[],
  totalFcfa: number,
) {
  const avantParId = new Map(avant.map((r) => [r.id, r]));
  // Un repas déjà cuisiné (ou passé) appartient à l'historique : il ne bouge plus
  const statuts = new Map(plan.meals.map((r) => [r.id, r.status ?? "planned"]));
  const fige = (id: string) => statuts.has(id) && statuts.get(id) !== "planned";
  const change = (r: RepasPlace) => {
    const a = avantParId.get(r.id);
    return (
      !a ||
      a.recipeId !== r.recipeId ||
      a.jour !== r.jour ||
      a.slot !== r.slot ||
      a.servings !== r.servings ||
      a.leftoverFromId !== r.leftoverFromId
    );
  };
  if (apres.some((r) => change(r) && fige(r.id)) || retires.some(fige)) {
    throw new ErreurApi(
      "REPASINCOMPATIBLE",
      "Un repas déjà cuisiné ne peut plus être déplacé ni modifié.",
    );
  }
  await prisma.$transaction([
    ...apres.filter(change).map((r) => {
      const data = {
        recipeId: r.recipeId,
        date: dateDuMenu(plan, r.jour),
        slot: r.slot,
        servings: r.servings,
        leftoverFromId: r.leftoverFromId,
      };
      return r.id === NOUVEAUREPAS
        ? prisma.plannedMeal.create({ data: { ...data, mealPlanId: plan.id } })
        : prisma.plannedMeal.update({ where: { id: r.id }, data });
    }),
    ...(retires.length > 0
      ? [prisma.plannedMeal.deleteMany({ where: { id: { in: retires }, mealPlanId: plan.id } })]
      : []),
    prisma.mealPlan.update({ where: { id: plan.id }, data: { estimatedCostFcfa: totalFcfa } }),
  ]);
}

/** Après une modification, la liste de courses d'un menu actif est refaite. */
async function relire(session: SessionVerifiee, plan: PlanAModifier): Promise<RepasRemplace> {
  const householdId = exigerFoyer(session);
  const liste = plan.status === "active" ? await genererListe(session, plan.id) : null;
  const enregistre = await prisma.mealPlan.findFirst({
    where: { id: plan.id, householdId },
    include: avecRepas,
  });
  if (!enregistre) throw new ErreurApi("ERREURSERVEUR");
  return { menu: versMenu(enregistre), liste };
}

/** Repas du foyer de la session et son menu ; un repas d'un autre foyer est introuvable. */
async function chargerRepas(session: SessionVerifiee, repasId: string) {
  const cible = await prisma.plannedMeal.findFirst({
    where: { id: repasId, mealPlan: { householdId: exigerFoyer(session) } },
    include: { mealPlan: { include: { meals: true } } },
  });
  if (!cible) throw new ErreurApi("INTROUVABLE");
  if (cible.course) throw new ErreurApi("REPASINCOMPATIBLE", PLATDEFETE);
  if (cible.slot === "breakfast") throw new ErreurApi("REPASINCOMPATIBLE", PETITDEJEUNER);
  const { meals, ...menu } = cible.mealPlan;
  return {
    cible,
    plan: { ...menu, meals: repasDeLaSemaine(meals) } as PlanAModifier,
    // Créneaux de fête, que les repas ordinaires ne peuvent pas occuper
    fete: meals.filter((m) => m.course),
  };
}

/**
 * Déplace un repas à une autre date ou un autre créneau de la semaine. Si la place est prise,
 * les deux repas échangent leur place ; un dîner cuisiné en double emmène son reste.
 */
export async function deplacerRepas(
  session: SessionVerifiee,
  repasId: string,
  nouvelleDate?: string,
  nouveauSlot?: Creneau,
): Promise<RepasRemplace> {
  const { cible, plan, fete } = await chargerRepas(session, repasId);
  const verif = await chargerPourModifier(session, plan);
  const avant = versPlaces(plan);
  const jour = jourDuMenu(plan, nouvelleDate ? dateSansHeure(nouvelleDate) : cible.date);
  const dateVisee = dateDuMenu(plan, jour).getTime();
  if (fete.some((m) => m.date.getTime() === dateVisee && m.slot === (nouveauSlot ?? cible.slot))) {
    throw new ErreurApi(
      "REPASINCOMPATIBLE",
      "Ce créneau est celui du repas de fête : choisis-en un autre.",
    );
  }
  const apres = echangerRepas(avant, repasId, jour, nouveauSlot ?? cible.slot);
  const menu = verifierSemaine(apres, verif);
  await enregistrerSemaine(plan, avant, apres, [], menu.totalFcfa);
  return relire(session, plan);
}

/** Change les portions d'un repas (invités) ; un dîner en double garde son reste du lendemain. */
export async function changerPortions(
  session: SessionVerifiee,
  repasId: string,
  servings: number,
): Promise<RepasRemplace> {
  const { plan } = await chargerRepas(session, repasId);
  const verif = await chargerPourModifier(session, plan);
  const avant = versPlaces(plan);
  const apres = changerPortionsRepas(avant, repasId, servings);
  const menu = verifierSemaine(apres, verif);
  await enregistrerSemaine(plan, avant, apres, [], menu.totalFcfa);
  return relire(session, plan);
}

export type ReorganisationUrgence = RepasRemplace & {
  ancienneRecette: string;
  // Vrai si le dîner prévu ce soir a glissé au lendemain ; sinon il a été remplacé
  decale: boolean;
  message: string;
};

/**
 * Mode urgence (§11) : le plat rapide est servi ce soir et le dîner prévu glisse au lendemain,
 * comme tous les dîners suivants ; le dernier de la semaine sort du menu.
 * Si la semaine ne peut pas glisser (temps du soir, restes…), seul le dîner de ce soir est remplacé.
 */
export async function reorganiserUrgence(
  session: SessionVerifiee,
  recetteRapideId: string,
  // Le repas du moment (selon l'heure) ; par défaut, calculé maintenant
  creneau: MealSlot = creneauDuMoment(),
): Promise<ReorganisationUrgence> {
  if (creneau === "breakfast") return petitDejeunerUrgence(session, recetteRapideId);
  if (creneau === "lunch") return dejeunerUrgence(session, recetteRapideId);
  const actif = await menuActif(exigerFoyer(session));
  // Date du jour à Abidjan : les dates de repas sont des dates sans heure (minuit UTC)
  const aujourdhui = dateSansHeure(dateDuJour()).getTime();
  if (actif.meals.some((m) => m.course && m.slot === "dinner" && m.date.getTime() === aujourdhui)) {
    throw new ErreurApi(
      "DONNEESINVALIDES",
      "Ce soir, c'est le repas de fête : il n'est pas remplacé.",
    );
  }
  const ceSoir = actif.meals.find(
    (m) => m.slot === "dinner" && m.status === "planned" && m.date.getTime() === aujourdhui,
  );
  if (!ceSoir) throw new ErreurApi("DONNEESINVALIDES", "Aucun dîner prévu ce soir à remplacer.");
  const ancienneRecette = ceSoir.recipe.title;

  const plan: PlanAModifier = { ...actif, meals: repasDeLaSemaine(actif.meals) };
  // Une fête plus tard dans la semaine : les dîners (et les restes qui les suivent le midi) ne
  // glissent pas, pour ne jamais tomber sur elle ; seul ce soir est remplacé
  const feteApres = actif.meals.some((m) => m.course && m.date.getTime() > aujourdhui);
  const verif = await chargerPourModifier(session, plan);
  verifierPlatRapide(verif, recetteRapideId, "dinner");

  const avant = versPlaces(plan);
  try {
    if (feteApres) throw new ErreurApi("REPASINCOMPATIBLE");
    const { repas: apres, retires } = decalerDiners(
      avant,
      jourDuMenu(plan, ceSoir.date),
      recetteRapideId,
      verif.parametres.personnes,
    );
    const menu = verifierSemaine(apres, verif);
    await enregistrerSemaine(plan, avant, apres, retires, menu.totalFcfa);
    // En général demain soir ; demain midi si ce dîner était cuisiné en double l'avant-dernier soir
    const moment = apres.find((r) => r.id === ceSoir.id)?.slot === "lunch" ? "midi" : "soir";
    return {
      ...(await relire(session, plan)),
      ancienneRecette,
      decale: true,
      message: `« ${ancienneRecette} » est décalé à demain ${moment}.`,
    };
  } catch (erreur) {
    if (!(erreur instanceof ErreurApi) || erreur.code !== "REPASINCOMPATIBLE") throw erreur;
    // La semaine ne peut pas glisser : on remplace seulement le dîner de ce soir
    return {
      ...(await remplacerRepas(session, ceSoir.id, recetteRapideId)),
      ancienneRecette,
      decale: false,
      message: `« ${ancienneRecette} » ne peut pas être décalé à demain : il est remplacé ce soir.`,
    };
  }
}

/** Menu actif du foyer, avec ses repas et leurs recettes. */
async function menuActif(householdId: string) {
  const actif = await prisma.mealPlan.findFirst({
    where: { householdId, status: "active" },
    include: { meals: { include: { recipe: { select: { title: true } } } } },
    orderBy: { weekStart: "desc" },
  });
  if (!actif) {
    throw new ErreurApi("DONNEESINVALIDES", "Aucun menu actif. Génère d'abord un menu.");
  }
  return actif;
}

/** Le plat rapide se mange à ce moment, convient au foyer et à son équipement. */
function verifierPlatRapide(
  verif: Awaited<ReturnType<typeof chargerPourModifier>>,
  recetteRapideId: string,
  creneau: MealSlot,
) {
  const rapide = verif.catalogue.find((r) => r.id === recetteRapideId);
  if (!rapide) throw new ErreurApi("INTROUVABLE");
  if (!rapide.mealTypes.includes(creneau)) {
    throw new ErreurApi(
      "REPASINCOMPATIBLE",
      `Ce plat ne se mange pas ${MOMENTS[creneau].ce} : choisis-en un autre.`,
    );
  }
  if (
    incompatibilites(ingredientsAFiltrer(rapide), verif.restrictions).length > 0 ||
    equipementManquant(rapide.tags, verif.equipement).length > 0
  ) {
    throw new ErreurApi("REPASINCOMPATIBLE");
  }
  return rapide;
}

/** Urgence à midi : le plat rapide prend le déjeuner du jour et les déjeuners suivants glissent. */
async function dejeunerUrgence(
  session: SessionVerifiee,
  recetteRapideId: string,
): Promise<ReorganisationUrgence> {
  const actif = await menuActif(exigerFoyer(session));
  const aujourdhui = dateSansHeure(dateDuJour()).getTime();
  const duJour = actif.meals.filter((m) => m.slot === "lunch" && m.date.getTime() === aujourdhui);
  if (duJour.some((m) => m.course)) {
    throw new ErreurApi(
      "DONNEESINVALIDES",
      "Ce midi, c'est le repas de fête : il n'est pas remplacé.",
    );
  }
  const ceMidi = duJour.find((m) => m.status === "planned");
  if (!ceMidi) throw new ErreurApi("DONNEESINVALIDES", "Aucun déjeuner prévu ce midi à remplacer.");
  // Des restes déjà cuisinés : les remplacer, ce serait les jeter
  if (ceMidi.leftoverFromId) {
    throw new ErreurApi(
      "DONNEESINVALIDES",
      "Ce midi, ce sont les restes d'hier : ils sont déjà prêts, il suffit de les réchauffer.",
    );
  }
  const ancienneRecette = ceMidi.recipe.title;
  const plan: PlanAModifier = { ...actif, meals: repasDeLaSemaine(actif.meals) };
  const verif = await chargerPourModifier(session, plan);
  verifierPlatRapide(verif, recetteRapideId, "lunch");

  const avant = versPlaces(plan);
  try {
    const joursDeFete = actif.meals
      .filter((m) => m.course && m.slot === "lunch")
      .map((m) => jourDuMenu(plan, m.date));
    const { repas: apres, retires } = decalerDejeuners(
      avant,
      jourDuMenu(plan, ceMidi.date),
      recetteRapideId,
      verif.parametres.personnes,
      joursDeFete,
    );
    const menu = verifierSemaine(apres, verif);
    await enregistrerSemaine(plan, avant, apres, retires, menu.totalFcfa);
    const decaleA = apres.find((r) => r.id === ceMidi.id);
    return {
      ...(await relire(session, plan)),
      ancienneRecette,
      decale: Boolean(decaleA),
      message: decaleA
        ? `« ${ancienneRecette} » est décalé à un prochain midi.`
        : `« ${ancienneRecette} » sort du menu : ses ingrédients restent dans ton stock.`,
    };
  } catch (erreur) {
    if (!(erreur instanceof ErreurApi) || erreur.code !== "REPASINCOMPATIBLE") throw erreur;
    // La semaine ne peut pas glisser : on remplace seulement le déjeuner de ce midi
    return {
      ...(await remplacerRepas(session, ceMidi.id, recetteRapideId)),
      ancienneRecette,
      decale: false,
      message: `« ${ancienneRecette} » ne peut pas être décalé : il est remplacé ce midi.`,
    };
  }
}

/**
 * Urgence le matin : les menus n'ont pas de petit déjeuner, rien n'est remplacé. Le plat rapide
 * est ajouté au menu de ce matin, pour que « C'est cuisiné » retire bien ses ingrédients du stock.
 */
async function petitDejeunerUrgence(
  session: SessionVerifiee,
  recetteRapideId: string,
): Promise<ReorganisationUrgence> {
  const actif = await menuActif(exigerFoyer(session));
  const aujourdhui = dateSansHeure(dateDuJour());
  const jour = Math.round((aujourdhui.getTime() - actif.weekStart.getTime()) / MSPARJOUR);
  if (jour < 0 || jour >= JOURSSEMAINE) {
    throw new ErreurApi("DONNEESINVALIDES", "Le menu actif ne couvre pas aujourd'hui.");
  }
  const plan: PlanAModifier = { ...actif, meals: repasDeLaSemaine(actif.meals) };
  const verif = await chargerPourModifier(session, plan);
  const rapide = verifierPlatRapide(verif, recetteRapideId, "breakfast");

  const existant = actif.meals.find(
    (m) => m.slot === "breakfast" && m.date.getTime() === aujourdhui.getTime(),
  );
  if (existant && existant.status !== "planned") {
    throw new ErreurApi("DONNEESINVALIDES", "Le petit déjeuner de ce matin est déjà cuisiné.");
  }
  const personnes = verif.parametres.personnes;
  if (existant) {
    await prisma.plannedMeal.update({
      where: { id: existant.id },
      data: { recipeId: rapide.id, servings: personnes },
    });
  } else {
    await prisma.plannedMeal.create({
      data: {
        mealPlanId: actif.id,
        recipeId: rapide.id,
        date: aujourdhui,
        slot: "breakfast",
        servings: personnes,
      },
    });
  }
  return {
    ...(await relire(session, plan)),
    ancienneRecette: existant?.recipe.title ?? "",
    decale: false,
    message: `${rapide.title} ce matin. Appuie sur « C'est cuisiné » une fois prêt.`,
  };
}

/**
 * Repas que le mode urgence remplacera : celui du moment (selon l'heure), sauf à midi quand
 * aucun déjeuner n'est prévu aujourd'hui (déjà cuisiné ou absent) : c'est alors le dîner.
 * L'écran propose les plats de ce repas-là, et l'envoie avec le choix de la famille.
 */
export async function creneauUrgence(
  session: SessionVerifiee,
  maintenant = new Date(),
): Promise<MealSlot> {
  const moment = creneauDuMoment(maintenant);
  if (moment !== "lunch" || !session.householdId) return moment;
  const aujourdhui = dateSansHeure(dateDuJour(maintenant));
  const midi = await prisma.plannedMeal.findFirst({
    where: {
      slot: "lunch",
      date: aujourdhui,
      status: "planned",
      mealPlan: { householdId: session.householdId, status: "active" },
    },
    select: { id: true },
  });
  return midi ? "lunch" : "dinner";
}
