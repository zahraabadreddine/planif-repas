import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { listerMembres } from "@/lib/foyer/membres";
import { avecIngredients, lignesPourCout, type LigneRecette } from "@/lib/catalogue/recettes";
import { coutRecette } from "@/lib/catalogue/cout";
import { recettesVisibles } from "@/lib/catalogue/plats-foyer";
import { genererListe } from "@/lib/courses/generation";
import {
  equipementManquant,
  incompatibilites,
  restrictionsDuFoyer,
  type RestrictionAFiltrer,
} from "@/lib/planificateur/filtres";
import type { CategoriePlat } from "@/lib/validation/plat-foyer";
import type { DemandeFete } from "@/lib/validation/fete";

// Menu de fête : plusieurs plats au même repas, pour beaucoup de personnes, avec un budget
// propre. Tout est vérifié et calculé par le code (règles 1, 2 et 3) ; la famille confirme.

/** Ordre d'un repas de fête, pour l'affichage et la carte. */
export const ORDRECATEGORIES: CategoriePlat[] = ["entrée", "plat", "accompagnement", "dessert"];

export type PlatChiffre = {
  recetteId: string;
  titre: string;
  categorie: CategoriePlat;
  coutFcfa: number;
};

export type MenuFete = {
  date: string;
  creneau: "lunch" | "dinner";
  personnes: number;
  budgetFcfa: number;
  plats: PlatChiffre[];
  totalFcfa: number;
  // 0 quand le menu tient dans le budget
  depassementFcfa: number;
  // Ingrédients sans prix connu : exclus du total, signalés à la famille
  sansPrix: string[];
};

/** Coût d'une recette pour un nombre de personnes, à partir des prix retenus (règle 3). */
export function coutPour(recette: LigneRecette, personnes: number, maintenant: Date) {
  const cout = coutRecette(lignesPourCout(recette), recette.servings, maintenant);
  return {
    coutFcfa: Math.round((cout.totalFcfa * personnes) / Math.max(1, recette.servings)),
    sansPrix: cout.sansPrix,
  };
}

/** Additionne les plats et compare au budget ; les plats sont rangés entrée → dessert. */
export function chiffrerFete(
  demande: Pick<DemandeFete, "date" | "creneau" | "personnes" | "budgetFcfa">,
  plats: (PlatChiffre & { sansPrix: string[] })[],
): MenuFete {
  const ranges = [...plats].sort(
    (a, b) => ORDRECATEGORIES.indexOf(a.categorie) - ORDRECATEGORIES.indexOf(b.categorie),
  );
  const totalFcfa = ranges.reduce((total, p) => total + p.coutFcfa, 0);
  return {
    date: demande.date,
    creneau: demande.creneau,
    personnes: demande.personnes,
    budgetFcfa: demande.budgetFcfa,
    plats: ranges.map(({ recetteId, titre, categorie, coutFcfa }) => ({
      recetteId,
      titre,
      categorie,
      coutFcfa,
    })),
    totalFcfa,
    depassementFcfa: Math.max(0, totalFcfa - demande.budgetFcfa),
    sansPrix: [...new Set(ranges.flatMap((p) => p.sansPrix))],
  };
}

/** Raison pour laquelle un plat ne convient pas au foyer, ou null s'il convient. */
export function raisonRefus(
  recette: Pick<LigneRecette, "title" | "tags" | "ingredients">,
  restrictions: RestrictionAFiltrer[],
  equipement: string[],
): string | null {
  const interdits = incompatibilites(
    recette.ingredients.map((l) => l.ingredient),
    restrictions,
  );
  if (interdits.length > 0) {
    return `« ${recette.title} » ne convient pas (${interdits.map((i) => i.raison).join(", ")}).`;
  }
  if (equipementManquant(recette.tags, equipement).length > 0) {
    return `« ${recette.title} » demande un four, que le foyer n'a pas.`;
  }
  return null;
}

/**
 * Compose et chiffre un menu de fête : chaque plat doit être visible du foyer (catalogue validé
 * ou plat du foyer), sans allergène ni régime interdit, et faisable avec son équipement.
 */
export async function composerFete(
  session: SessionVerifiee,
  demande: DemandeFete,
): Promise<MenuFete> {
  const householdId = session.householdId;
  if (!householdId) throw new ErreurApi("FOYERMANQUANT");

  const ids = demande.plats.map((p) => p.recetteId);
  const [recettes, membres, foyer] = await Promise.all([
    prisma.recipe.findMany({
      where: { id: { in: ids }, ...recettesVisibles(householdId) },
      include: avecIngredients,
    }),
    listerMembres(session),
    prisma.household.findUnique({ where: { id: householdId }, select: { equipment: true } }),
  ]);
  if (recettes.length !== new Set(ids).size) {
    throw new ErreurApi("INTROUVABLE", "Un des plats n'est pas disponible pour ton foyer.");
  }

  const restrictions = restrictionsDuFoyer(membres);
  const equipement = Array.isArray(foyer?.equipment)
    ? foyer.equipment.filter((e): e is string => typeof e === "string")
    : [];
  const parId = new Map(recettes.map((r) => [r.id, r as LigneRecette]));
  const maintenant = new Date();

  const plats = demande.plats.map((p) => {
    const recette = parId.get(p.recetteId)!;
    const refus = raisonRefus(recette, restrictions, equipement);
    if (refus) throw new ErreurApi("DONNEESINVALIDES", refus);
    return {
      recetteId: recette.id,
      titre: recette.title,
      categorie: p.categorie,
      ...coutPour(recette, demande.personnes, maintenant),
    };
  });
  return chiffrerFete(demande, plats);
}

/** Jour ISO → date sans heure, comme les dates de repas en base. */
const jour = (iso: string) => new Date(`${iso}T00:00:00Z`);

/**
 * Met le menu de fête dans le menu de la semaine, à la place du repas prévu à ce créneau.
 * Le code revérifie tout à la confirmation (règle 1) ; un menu hors budget est refusé.
 */
export async function appliquerFete(
  session: SessionVerifiee,
  demande: DemandeFete,
): Promise<{ menuId: string; plats: number }> {
  const householdId = session.householdId;
  if (!householdId) throw new ErreurApi("FOYERMANQUANT");

  const fete = await composerFete(session, demande);
  if (fete.depassementFcfa > 0) {
    throw new ErreurApi(
      "DONNEESINVALIDES",
      `Ce menu dépasse ton budget de ${fete.depassementFcfa} FCFA : retire ou remplace un plat.`,
    );
  }

  // Le menu de la semaine qui contient ce jour : le menu validé d'abord, sinon le brouillon
  const date = jour(demande.date);
  const debutPossible = new Date(date);
  debutPossible.setUTCDate(debutPossible.getUTCDate() - 6);
  const menus = await prisma.mealPlan.findMany({
    where: {
      householdId,
      status: { in: ["active", "draft"] },
      weekStart: { gte: debutPossible, lte: date },
    },
    include: { meals: true },
  });
  const menu = menus.find((m) => m.status === "active") ?? menus[0];
  if (!menu) {
    throw new ErreurApi(
      "INTROUVABLE",
      "Aucun menu ne couvre ce jour : prépare d'abord le menu de la semaine.",
    );
  }

  const remplaces = menu.meals.filter(
    (m) => m.date.getTime() === date.getTime() && m.slot === demande.creneau,
  );
  if (remplaces.some((m) => m.status === "cooked")) {
    throw new ErreurApi(
      "DONNEESINVALIDES",
      "Ce repas est déjà cuisiné : il ne peut plus être remplacé.",
    );
  }

  await prisma.$transaction(async (tx) => {
    for (const repas of remplaces) {
      // Un reste qui disparaît : le dîner d'origine n'a plus à être cuisiné en double
      if (repas.leftoverFromId) {
        const origine = menu.meals.find((m) => m.id === repas.leftoverFromId);
        if (origine) {
          await tx.plannedMeal.update({
            where: { id: origine.id },
            data: { servings: Math.max(1, origine.servings - repas.servings) },
          });
        }
      }
    }
    // Les restes qui venaient d'un repas remplacé deviennent des repas ordinaires (SetNull)
    await tx.plannedMeal.deleteMany({ where: { id: { in: remplaces.map((m) => m.id) } } });
    await tx.plannedMeal.createMany({
      data: fete.plats.map((p) => ({
        mealPlanId: menu.id,
        recipeId: p.recetteId,
        date,
        slot: demande.creneau,
        servings: demande.personnes,
        course: p.categorie,
      })),
    });
  });

  // Un menu validé : la liste de courses suit (règle 3, calculée par le code)
  if (menu.status === "active") await genererListe(session, menu.id);
  return { menuId: menu.id, plats: fete.plats.length };
}
