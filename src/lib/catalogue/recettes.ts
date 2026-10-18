import { z } from "zod";
import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { listerMembres } from "@/lib/foyer/membres";
import {
  incompatibilites,
  restrictionsDuFoyer,
  type RestrictionAFiltrer,
} from "@/lib/planificateur/filtres";
import type { Filtres } from "@/lib/validation/catalogue";
import { coutRecette, meilleurPrix, type LignePourCout } from "./cout";
import { afficherQuantite } from "./quantites";
import { filtrerCatalogue, type RecetteResume } from "./recherche";

// Catalogue et fiche recette (EF-20). Seules les recettes validées sont visibles.

/** Ville des prix : le pilote se déroule à Abidjan. */
export const VILLE = "Abidjan";

const avecIngredients = {
  ingredients: {
    include: {
      unit: true,
      ingredient: {
        include: {
          // Unités propres à l'ingrédient (tas, pièce, tranche…), pour afficher les quantités
          units: true,
          prices: { where: { city: VILLE }, include: { unit: true } },
        },
      },
    },
  },
} as const;

type LigneRecette = Awaited<ReturnType<typeof chargerRecettes>>[number];

function chargerRecettes(id?: string) {
  return prisma.recipe.findMany({
    where: { validated: true, ...(id ? { id } : {}) },
    include: avecIngredients,
    orderBy: { title: "asc" },
  });
}

function lignesPourCout(recette: LigneRecette): LignePourCout[] {
  return recette.ingredients.map((ligne) => ({
    ingredient: ligne.ingredient.name,
    grams: ligne.quantity * ligne.unit.gramsEquivalent,
    optional: ligne.optional,
    releves: ligne.ingredient.prices.map((prix) => ({
      priceFcfa: prix.priceFcfa,
      grams: prix.unit.gramsEquivalent,
      source: prix.source,
      observedAt: prix.observedAt,
      placeType: prix.placeType,
    })),
  }));
}

function resumer(
  recette: LigneRecette,
  restrictions: RestrictionAFiltrer[],
  maintenant: Date,
): RecetteResume {
  return {
    id: recette.id,
    title: recette.title,
    cuisine: recette.cuisine,
    minutes: recette.prepMinutes + recette.cookMinutes,
    difficulty: recette.difficulty,
    servings: recette.servings,
    tags: recette.tags,
    ingredients: recette.ingredients.map((l) => l.ingredient.name),
    cout: coutRecette(lignesPourCout(recette), recette.servings, maintenant),
    incompatibilites: incompatibilites(
      recette.ingredients.map((l) => l.ingredient),
      restrictions,
    ),
  };
}

export async function listerCatalogue(session: SessionVerifiee, filtres: Filtres) {
  const [recettes, membres] = await Promise.all([chargerRecettes(), listerMembres(session)]);
  const restrictions = restrictionsDuFoyer(membres);
  const maintenant = new Date();
  return filtrerCatalogue(
    recettes.map((recette) => resumer(recette, restrictions, maintenant)),
    filtres,
  );
}

export type EtapeRecette = { text: string; minutes: number };

/** Les étapes sont un champ Json : on ne garde que les étapes bien formées. */
function lireEtapes(valeur: unknown): EtapeRecette[] {
  if (!Array.isArray(valeur)) return [];
  return valeur.filter(
    (e): e is EtapeRecette =>
      typeof e === "object" &&
      e !== null &&
      typeof (e as EtapeRecette).text === "string" &&
      typeof (e as EtapeRecette).minutes === "number",
  );
}

const lireTextes = (valeur: unknown): string[] =>
  Array.isArray(valeur) ? valeur.filter((v): v is string => typeof v === "string") : [];

export type IngredientFiche = {
  nom: string;
  quantite: string;
  optional: boolean;
  prix: "releve" | "estimation" | "inconnu";
};

export type RecetteDetail = RecetteResume & {
  difficulte: string;
  etapes: EtapeRecette[];
  idees: string[];
  ingredientsFiche: IngredientFiche[];
};

const DIFFICULTES = ["", "Facile", "Moyen", "Difficile"];

/** Fiche d'une recette validée, ou null si elle n'existe pas ou n'est pas validée. */
export async function lireRecette(
  session: SessionVerifiee,
  id: string,
): Promise<RecetteDetail | null> {
  // Un identifiant mal formé ne peut désigner aucune recette.
  if (!z.uuid().safeParse(id).success) return null;
  const [[recette], membres] = await Promise.all([chargerRecettes(id), listerMembres(session)]);
  if (!recette) return null;
  const maintenant = new Date();
  const lignes = lignesPourCout(recette);
  return {
    ...resumer(recette, restrictionsDuFoyer(membres), maintenant),
    difficulte: DIFFICULTES[recette.difficulty] ?? "",
    etapes: lireEtapes(recette.steps),
    idees: lireTextes(recette.leftoverIdeas),
    ingredientsFiche: recette.ingredients.map((ligne, i) => ({
      nom: ligne.ingredient.name,
      quantite: afficherQuantite(
        ligne.quantity,
        { label: ligne.unit.label, grams: ligne.unit.gramsEquivalent },
        ligne.ingredient.units.map((u) => ({ label: u.label, grams: u.gramsEquivalent })),
      ),
      optional: ligne.optional,
      prix: meilleurPrix(lignes[i].releves, maintenant)?.nature ?? "inconnu",
    })),
  };
}
