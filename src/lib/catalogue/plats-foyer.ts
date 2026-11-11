import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { listerMembres } from "@/lib/foyer/membres";
import { incompatibilites, restrictionsDuFoyer } from "@/lib/planificateur/filtres";
import { normaliser } from "@/lib/validation/membre";
import type { PlatFoyerDemande } from "@/lib/validation/plat-foyer";

// Plats propres à un foyer : des idées d'Umi gardées par la famille, avec ses quantités.
// Ils ne sont jamais visibles des autres foyers (règle 4) ni de l'administratrice.

/**
 * Grammes proposés par personne selon la catégorie de l'ingrédient (règle 3 : c'est le code
 * qui propose, la famille valide ou corrige). Les assaisonnements comptent peu.
 */
const GRAMMESPARCATEGORIE: Record<string, number> = {
  viande: 150,
  volaille: 150,
  poisson: 150,
  porc: 150,
  "fruits de mer": 150,
  legume: 100,
  fruit: 100,
  legumineuse: 100,
  feculent: 80,
  pain: 80,
  oeufs: 50,
  conserve: 60,
  "produit laitier": 30,
  oleagineux: 10,
  huile: 8,
  epicerie: 8,
  herbe: 3,
  epice: 1,
};

/** Pour une catégorie inconnue : une portion moyenne. */
const GRAMMESPARDEFAUT = 50;

/** Quantité proposée par le code pour un ingrédient et un nombre de personnes, arrondie. */
export function grammesProposes(categorie: string, personnes: number): number {
  const parPersonne = GRAMMESPARCATEGORIE[normaliser(categorie)] ?? GRAMMESPARDEFAUT;
  const total = parPersonne * personnes;
  // Arrondi lisible : au gramme près sous 50 g, à 10 g près au-delà
  return total < 50 ? Math.max(1, Math.round(total)) : Math.round(total / 10) * 10;
}

/** Plats visibles d'un foyer : le catalogue validé de l'équipe et ses propres plats. */
export function recettesVisibles(householdId: string) {
  return { OR: [{ validated: true, householdId: null }, { householdId }] };
}

export type PlatEnregistre = { id: string; titre: string };

/**
 * Garde un plat pour le foyer de la session. Le code revérifie les allergies et les régimes
 * avant d'enregistrer (règle 2), même si l'idée l'avait déjà été.
 */
export async function enregistrerPlatDuFoyer(
  session: SessionVerifiee,
  plat: PlatFoyerDemande,
): Promise<PlatEnregistre> {
  const householdId = session.householdId;
  if (!householdId) throw new ErreurApi("FOYERMANQUANT");

  const ids = [...new Set(plat.ingredients.map((i) => i.ingredientId))];
  const [ingredients, membres, gramme] = await Promise.all([
    prisma.ingredient.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, category: true, allergens: true },
    }),
    listerMembres(session),
    prisma.marketUnit.findFirst({
      where: { ingredientId: null, label: "g" },
      select: { id: true },
    }),
  ]);
  if (ingredients.length !== ids.length) {
    throw new ErreurApi("DONNEESINVALIDES", "Un ingrédient n'existe pas dans le catalogue.");
  }
  if (incompatibilites(ingredients, restrictionsDuFoyer(membres)).length > 0) {
    throw new ErreurApi(
      "DONNEESINVALIDES",
      "Ce plat contient un aliment à éviter pour un membre du foyer.",
    );
  }
  if (!gramme) throw new ErreurApi("ERREURSERVEUR");

  // Un ingrédient cité deux fois : ses quantités s'additionnent
  const grammes = new Map<string, number>();
  for (const i of plat.ingredients) {
    grammes.set(i.ingredientId, (grammes.get(i.ingredientId) ?? 0) + i.grammes);
  }

  const recette = await prisma.recipe.create({
    data: {
      title: plat.titre,
      cuisine: "maison",
      mealTypes: ["lunch", "dinner"],
      prepMinutes: 0,
      cookMinutes: 0,
      needsCooking: true,
      servings: plat.personnes,
      difficulty: 2,
      tags: ["plat-du-foyer", ...(plat.categorie ? [plat.categorie] : [])],
      // Même format que les recettes de l'équipe, pour s'afficher sur la fiche
      steps: plat.etapes.map((text) => ({ text, minutes: 0 })),
      source: "ai",
      // Jamais dans le catalogue de l'équipe : seulement chez ce foyer
      validated: false,
      householdId,
      ingredients: {
        create: [...grammes].map(([ingredientId, quantity]) => ({
          ingredientId,
          unitId: gramme.id,
          quantity,
        })),
      },
    },
    select: { id: true, title: true },
  });
  return { id: recette.id, titre: recette.title };
}
