import type { MealSlot, MealStatus, PlanStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import {
  avecIngredients,
  chargerRecettes,
  lignesPourCout,
  type LigneRecette,
} from "@/lib/catalogue/recettes";
import { coutRecette } from "@/lib/catalogue/cout";
import { genererListe, type ListeEnregistree } from "@/lib/courses/generation";
import { listerMembres } from "@/lib/foyer/membres";
import type { Note } from "@/lib/validation/note";
import { composerMenu, type ParametresComposition } from "./composition";
import { equipementManquant, incompatibilites, restrictionsDuFoyer } from "./filtres";
import { classer, ingredientPrincipal, JOURSVARIETE, type RecetteANoter } from "./score";
import { verifierMenu, type RecetteAVerifier } from "./verification";

// Menu de la semaine (EF-06) : filtres durs, notation, composition, vérification, puis brouillon.
// Le foyer vient toujours de la session (règle 4) ; tous les calculs sont faits ici (règle 3).

export type RepasEnregistre = {
  id: string;
  date: string;
  slot: MealSlot;
  servings: number;
  status: MealStatus;
  leftoverFromId: string | null;
  recipe: { id: string; title: string; minutes: number; coutFcfa: number };
};

export type MenuEnregistre = {
  id: string;
  weekStart: string;
  status: PlanStatus;
  estimatedCostFcfa: number;
  generationNotes: string | null;
  meals: RepasEnregistre[];
};

const listeDeTextes = z.array(z.string()).catch([]);

export const avecRepas = {
  meals: {
    include: {
      recipe: { select: { id: true, title: true, prepMinutes: true, cookMinutes: true } },
    },
    orderBy: [{ date: "asc" as const }, { slot: "asc" as const }],
  },
};

export type LigneMenu = {
  id: string;
  weekStart: Date;
  status: PlanStatus;
  estimatedCostFcfa: number;
  generationNotes: string | null;
  meals: {
    id: string;
    date: Date;
    slot: MealSlot;
    servings: number;
    status: MealStatus;
    leftoverFromId: string | null;
    recipe: { id: string; title: string; prepMinutes: number; cookMinutes: number };
  }[];
};

const jourIso = (date: Date) => date.toISOString().slice(0, 10);

export function versMenu(menu: LigneMenu): MenuEnregistre {
  return {
    id: menu.id,
    weekStart: jourIso(menu.weekStart),
    status: menu.status,
    estimatedCostFcfa: menu.estimatedCostFcfa,
    generationNotes: menu.generationNotes,
    meals: menu.meals.map((repas) => ({
      id: repas.id,
      date: jourIso(repas.date),
      slot: repas.slot,
      servings: repas.servings,
      status: repas.status,
      leftoverFromId: repas.leftoverFromId,
      recipe: {
        id: repas.recipe.id,
        title: repas.recipe.title,
        minutes: repas.recipe.prepMinutes + repas.recipe.cookMinutes,
        coutFcfa: 0,
      },
    })),
  };
}

export function exigerFoyer(session: SessionVerifiee): string {
  if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");
  return session.householdId;
}

function decaler(date: Date, jours: number): Date {
  const decalee = new Date(date);
  decalee.setUTCDate(decalee.getUTCDate() + jours);
  return decalee;
}

export const ingredientsAFiltrer = (recette: LigneRecette) =>
  recette.ingredients.map((l) => l.ingredient);

/** Une recette du catalogue, sous les formes attendues par la notation et la vérification. */
export function versCandidate(
  recette: LigneRecette,
  maintenant: Date,
): RecetteAVerifier & RecetteANoter {
  const sansPrincipal = {
    id: recette.id,
    cuisine: recette.cuisine,
    mealTypes: recette.mealTypes,
    minutes: recette.prepMinutes + recette.cookMinutes,
    coutParPortionFcfa: coutRecette(lignesPourCout(recette), recette.servings, maintenant)
      .parPersonneFcfa,
    ingredients: recette.ingredients.map((ligne) => ({
      ...ligne.ingredient,
      grams: ligne.quantity * ligne.unit.gramsEquivalent,
      optional: ligne.optional,
    })),
  };
  return { ...sansPrincipal, principal: ingredientPrincipal(sansPrincipal) };
}

export async function chargerContexte(householdId: string, weekStart: Date) {
  const [foyer, stock, recents, notes] = await Promise.all([
    prisma.household.findUnique({ where: { id: householdId } }),
    prisma.stockItem.findMany({ where: { householdId, status: "useSoon" } }),
    prisma.plannedMeal.findMany({
      where: {
        mealPlan: { householdId },
        date: { gte: decaler(weekStart, -JOURSVARIETE), lt: weekStart },
      },
      select: { recipeId: true },
    }),
    prisma.dishRating.findMany({ where: { householdId } }),
  ]);
  if (!foyer) throw new ErreurApi("FOYERMANQUANT");
  return {
    budgetFcfa: foyer.weeklyBudgetFcfa,
    equipement: listeDeTextes.parse(foyer.equipment),
    cuisinesPreferees: listeDeTextes.parse(foyer.cuisinesPreferred),
    aConsommerVite: new Set(stock.map((s) => s.ingredientId)),
    servieRecemment: new Set(recents.map((r) => r.recipeId)),
    notes: new Map(
      notes
        .filter((n) => n.rating >= 1 && n.rating <= 3)
        .map((n) => [n.recipeId, n.rating as Note]),
    ),
  };
}

/** Noms des ingrédients principaux répétés, dans l'ordre et sans doublon (la note est lue par la famille). */
export function nomsIngredients(
  ids: string[],
  recettes: { ingredients: { id: string; name: string }[] }[],
): string[] {
  const noms = new Map(recettes.flatMap((r) => r.ingredients.map((i) => [i.id, i.name] as const)));
  return [...new Set(ids.map((id) => (noms.get(id) ?? "un ingrédient").toLowerCase()))];
}

const IDENTIFIANT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** Remplace les identifiants d'une ancienne note par les noms des ingrédients (« poulet »). */
export function noteAvecNoms(note: string, noms: Map<string, string>): string {
  return note.replace(IDENTIFIANT, (id) =>
    (noms.get(id.toLowerCase()) ?? "un ingrédient").toLowerCase(),
  );
}

/** Les menus créés avant la correction gardent des identifiants dans leur note : on les traduit à la lecture. */
async function noteLisible(note: string | null): Promise<string | null> {
  const ids = note?.match(IDENTIFIANT);
  if (!note || !ids) return note;
  const ingredients = await prisma.ingredient.findMany({
    where: { id: { in: [...new Set(ids.map((id) => id.toLowerCase()))] } },
    select: { id: true, name: true },
  });
  return noteAvecNoms(note, new Map(ingredients.map((i) => [i.id, i.name])));
}

/** Génère le brouillon du menu de la semaine ; un brouillon existant pour cette semaine est remplacé. */
export async function genererMenu(
  session: SessionVerifiee,
  weekStart: Date,
): Promise<MenuEnregistre> {
  const householdId = exigerFoyer(session);
  const [recettes, membres, contexte] = await Promise.all([
    chargerRecettes(),
    listerMembres(session),
    chargerContexte(householdId, weekStart),
  ]);
  const restrictions = restrictionsDuFoyer(membres);
  const parametres: ParametresComposition = {
    personnes: Math.max(1, membres.length),
    weekStart,
    budgetFcfa: contexte.budgetFcfa,
  };

  // Filtres durs (règle 2) : faits par le code avant toute notation
  const maintenant = new Date();
  const candidates = recettes
    .filter(
      (r) =>
        incompatibilites(ingredientsAFiltrer(r), restrictions).length === 0 &&
        equipementManquant(r.tags, contexte.equipement).length === 0,
    )
    .map((r) => versCandidate(r, maintenant));

  const classees = classer(candidates, {
    budgetParPortionFcfa: Math.round(parametres.budgetFcfa / (parametres.personnes * 14)),
    mois: weekStart.getUTCMonth() + 1,
    aConsommerVite: contexte.aConsommerVite,
    servieRecemment: contexte.servieRecemment,
    notes: contexte.notes,
    cuisinesPreferees: contexte.cuisinesPreferees,
  });

  const resultat = composerMenu(classees, parametres);
  if (!resultat.ok) throw new ErreurApi(resultat.code);
  const { menu } = resultat;
  // Ne devrait jamais arriver : la composition respecte déjà ces règles
  if (verifierMenu(menu, candidates, restrictions, parametres).length > 0) {
    throw new ErreurApi("ERREURSERVEUR");
  }

  const id = await prisma.$transaction(async (tx) => {
    await tx.mealPlan.deleteMany({ where: { householdId, weekStart, status: "draft" } });
    const plan = await tx.mealPlan.create({
      data: {
        householdId,
        weekStart,
        estimatedCostFcfa: menu.totalFcfa,
        generationNotes:
          menu.principauxRepetes.length > 0
            ? `Servi deux fois faute d'assez de recettes : ${nomsIngredients(
                menu.principauxRepetes,
                recettes.map((r) => ({ ingredients: r.ingredients.map((l) => l.ingredient) })),
              ).join(", ")}.`
            : null,
      },
    });
    // Un repas de restes pointe vers le dîner d'origine, créé avant lui
    const ids: string[] = [];
    for (const repas of menu.repas) {
      const cree = await tx.plannedMeal.create({
        data: {
          mealPlanId: plan.id,
          recipeId: repas.recetteId,
          date: decaler(weekStart, repas.jour),
          slot: repas.slot,
          servings: repas.portions,
          leftoverFromId: repas.resteDe === null ? null : ids[repas.resteDe],
        },
      });
      ids.push(cree.id);
    }
    return plan.id;
  });

  const enregistre = await prisma.mealPlan.findFirst({
    where: { id, householdId },
    include: avecRepas,
  });
  if (!enregistre) throw new ErreurApi("ERREURSERVEUR");
  return versMenu(enregistre);
}

async function enrichirAvecCout(menu: MenuEnregistre): Promise<MenuEnregistre> {
  const ids = [...new Set(menu.meals.map((m) => m.recipe.id))];
  if (ids.length === 0) return menu;
  const recettes = await prisma.recipe.findMany({
    where: { id: { in: ids } },
    include: avecIngredients,
  });
  const parId = new Map(recettes.map((r) => [r.id, r]));
  const maintenant = new Date();
  return {
    ...menu,
    meals: menu.meals.map((repas) => {
      const recette = parId.get(repas.recipe.id);
      const coutFcfa = recette
        ? coutRecette(lignesPourCout(recette as LigneRecette), recette.servings, maintenant)
            .totalFcfa
        : 0;
      return { ...repas, recipe: { ...repas.recipe, coutFcfa } };
    }),
  };
}

/** Menu actif du foyer, sinon le dernier brouillon, sinon null. */
export async function lireMenuCourant(session: SessionVerifiee): Promise<MenuEnregistre | null> {
  if (!session.householdId) return null;
  const { householdId } = session;
  const actif = await prisma.mealPlan.findFirst({
    where: { householdId, status: "active" },
    include: avecRepas,
    orderBy: { weekStart: "desc" },
  });
  const menu =
    actif ??
    (await prisma.mealPlan.findFirst({
      where: { householdId, status: "draft" },
      include: avecRepas,
      orderBy: { createdAt: "desc" },
    }));
  if (!menu) return null;
  const lu = await enrichirAvecCout(versMenu(menu));
  return { ...lu, generationNotes: await noteLisible(lu.generationNotes) };
}

/** Valide un menu : il devient le seul actif du foyer et sa liste de courses est calculée. */
export async function activerMenu(
  session: SessionVerifiee,
  id: string,
): Promise<{ menu: MenuEnregistre; liste: ListeEnregistree }> {
  const householdId = exigerFoyer(session);
  const [plan, membres] = await Promise.all([
    prisma.mealPlan.findFirst({
      where: { id, householdId },
      include: {
        meals: {
          include: { recipe: { include: { ingredients: { include: { ingredient: true } } } } },
        },
      },
    }),
    listerMembres(session),
  ]);
  if (!plan) throw new ErreurApi("INTROUVABLE");

  // Les membres ont pu changer depuis la génération : on revérifie avant d'appliquer (règle 1)
  const restrictions = restrictionsDuFoyer(membres);
  const incompatible = plan.meals.some(
    (repas) =>
      incompatibilites(
        repas.recipe.ingredients.map((l) => l.ingredient),
        restrictions,
      ).length > 0,
  );
  if (incompatible) throw new ErreurApi("MENUINCOMPATIBLE");

  await prisma.$transaction([
    prisma.mealPlan.updateMany({
      where: { householdId, status: "active", weekStart: plan.weekStart, id: { not: plan.id } },
      data: { status: "archived" },
    }),
    prisma.mealPlan.update({ where: { id: plan.id }, data: { status: "active" } }),
  ]);
  const liste = await genererListe(session, plan.id);
  const actif = await prisma.mealPlan.findFirst({
    where: { id: plan.id, householdId },
    include: avecRepas,
  });
  if (!actif) throw new ErreurApi("ERREURSERVEUR");
  return { menu: versMenu(actif), liste };
}
