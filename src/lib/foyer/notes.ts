import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { listerMembres } from "@/lib/foyer/membres";
import { lireFoyer } from "@/lib/foyer/profil";
import {
  incompatibilites,
  restrictionsDuFoyer,
  type IngredientAFiltrer,
  type RestrictionAFiltrer,
} from "@/lib/planificateur/filtres";
import type { Note } from "@/lib/validation/note";

// Notes de plats du départ (EF-04). Le foyer vient toujours de la session (règle 4).

export type PlatANoter = { id: string; title: string; cuisine: string; rating: Note | null };

export type RecetteANoter = {
  id: string;
  title: string;
  cuisine: string;
  validated: boolean;
  ingredients: IngredientAFiltrer[];
};

const estNote = (valeur: number): valeur is Note => valeur === 1 || valeur === 2 || valeur === 3;

/**
 * Range les recettes pour que chaque série soit variée : un plat par cuisine, à tour de rôle,
 * en commençant par les cuisines préférées du foyer, puis les cuisines les mieux fournies.
 * Dans une cuisine, les recettes validées passent en premier.
 */
export function ordreVarie(
  recettes: RecetteANoter[],
  cuisinesPreferees: string[],
): RecetteANoter[] {
  const parCuisine = new Map<string, RecetteANoter[]>();
  for (const recette of recettes) {
    parCuisine.set(recette.cuisine, [...(parCuisine.get(recette.cuisine) ?? []), recette]);
  }
  for (const liste of parCuisine.values()) {
    liste.sort(
      (a, b) => Number(b.validated) - Number(a.validated) || a.title.localeCompare(b.title, "fr"),
    );
  }
  const rang = (cuisine: string) => {
    const position = cuisinesPreferees.indexOf(cuisine);
    return position === -1 ? cuisinesPreferees.length : position;
  };
  const cuisines = [...parCuisine.keys()].sort(
    (a, b) =>
      rang(a) - rang(b) ||
      parCuisine.get(b)!.length - parCuisine.get(a)!.length ||
      a.localeCompare(b, "fr"),
  );
  const ordre: RecetteANoter[] = [];
  for (let tour = 0; ordre.length < recettes.length; tour += 1) {
    for (const cuisine of cuisines) {
      const recette = parCuisine.get(cuisine)![tour];
      if (recette) ordre.push(recette);
    }
  }
  return ordre;
}

/**
 * Plats proposés à la notation : toutes les recettes (noter n'est pas proposer), sauf celles qui
 * ne conviennent pas au foyer, dans un ordre varié (voir ordreVarie).
 */
export function platsANoter(
  recettes: RecetteANoter[],
  restrictions: RestrictionAFiltrer[],
  notes: Map<string, number>,
  cuisinesPreferees: string[],
): PlatANoter[] {
  const compatibles = recettes.filter(
    (recette) => incompatibilites(recette.ingredients, restrictions).length === 0,
  );
  return ordreVarie(compatibles, cuisinesPreferees).map((recette) => {
    const note = notes.get(recette.id);
    return {
      id: recette.id,
      title: recette.title,
      cuisine: recette.cuisine,
      rating: note !== undefined && estNote(note) ? note : null,
    };
  });
}

const avecIngredients = {
  id: true,
  title: true,
  cuisine: true,
  validated: true,
  ingredients: {
    select: { ingredient: { select: { name: true, category: true, allergens: true } } },
  },
} as const;

async function recettesANoter(id?: string): Promise<RecetteANoter[]> {
  const recettes = await prisma.recipe.findMany({
    where: id ? { id } : {},
    select: avecIngredients,
  });
  return recettes.map((r) => ({ ...r, ingredients: r.ingredients.map((l) => l.ingredient) }));
}

/** Plats à noter pour le foyer de la session, avec la note déjà donnée. */
export async function platsDuFoyer(session: SessionVerifiee): Promise<PlatANoter[]> {
  if (!session.householdId) return [];
  const [recettes, membres, foyer, notes] = await Promise.all([
    recettesANoter(),
    listerMembres(session),
    lireFoyer(session),
    prisma.dishRating.findMany({
      where: { householdId: session.householdId },
      select: { recipeId: true, rating: true },
    }),
  ]);
  return platsANoter(
    recettes,
    restrictionsDuFoyer(membres),
    new Map(notes.map((n) => [n.recipeId, n.rating])),
    foyer?.cuisinesPreferred ?? [],
  );
}

/** Nombre de plats déjà notés par le foyer de la session. */
export async function nombreDeNotes(session: SessionVerifiee): Promise<number> {
  if (!session.householdId) return 0;
  return prisma.dishRating.count({ where: { householdId: session.householdId } });
}

/**
 * Enregistre ou change la note d'un plat ; null la retire. Un plat inexistant, ou qui ne
 * convient pas au foyer, est introuvable.
 */
export async function noterPlat(
  session: SessionVerifiee,
  recipeId: string,
  rating: Note | null,
): Promise<void> {
  const householdId = session.householdId;
  if (!householdId) throw new ErreurApi("FOYERMANQUANT");

  const [[recette], membres] = await Promise.all([
    recettesANoter(recipeId),
    listerMembres(session),
  ]);
  if (!recette || incompatibilites(recette.ingredients, restrictionsDuFoyer(membres)).length > 0) {
    throw new ErreurApi("INTROUVABLE");
  }

  if (rating === null) {
    await prisma.dishRating.deleteMany({ where: { householdId, recipeId } });
    return;
  }
  await prisma.dishRating.upsert({
    where: { householdId_recipeId: { householdId, recipeId } },
    update: { rating },
    create: { householdId, recipeId, rating },
  });
}
