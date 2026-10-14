// Remplit le catalogue avec les données de départ (npx prisma db seed).
// Peut être relancé sans erreur : chaque élément est retrouvé puis mis à jour, ou créé.

import { PrismaClient } from "@prisma/client";
import {
  ingredientsDepart,
  recettesDepart,
  unitesGeneriques,
  type IngredientDepart,
  type RecetteDepart,
} from "./donnees-depart.ts";

const ville = "Abidjan";

const prisma = new PrismaClient();

/** Retrouve ou crée une unité (générique si ingredientId vaut null). */
async function enregistrerUnite(ingredientId: string | null, label: string, grams: number) {
  const existante = await prisma.marketUnit.findFirst({ where: { ingredientId, label } });
  if (existante) {
    return prisma.marketUnit.update({
      where: { id: existante.id },
      data: { gramsEquivalent: grams },
    });
  }
  return prisma.marketUnit.create({ data: { ingredientId, label, gramsEquivalent: grams } });
}

/** Identifiant d'unité retrouvé par son libellé (« tas », « kg »…). */
type UnitesParLabel = Map<string, string>;

async function enregistrerIngredient(ingredient: IngredientDepart, generiques: UnitesParLabel) {
  const champs = {
    category: ingredient.category,
    allergens: ingredient.allergens,
    shelfLifeDays: ingredient.shelfLifeDays,
    seasonalMonths: ingredient.seasonalMonths,
    storageTip: ingredient.storageTip ?? null,
  };
  const { id } = await prisma.ingredient.upsert({
    where: { name: ingredient.name },
    update: champs,
    create: { name: ingredient.name, ...champs },
  });

  const unites: UnitesParLabel = new Map(generiques);
  for (const unite of ingredient.units) {
    const enregistree = await enregistrerUnite(id, unite.label, unite.grams);
    unites.set(unite.label, enregistree.id);
  }

  await prisma.ingredient.update({
    where: { id },
    data: { defaultUnitId: unites.get(ingredient.defaultUnit) },
  });

  for (const prix of ingredient.prices) {
    await enregistrerPrix(id, unites.get(prix.unit)!, prix.placeType, prix.priceFcfa);
  }

  return { id, unites };
}

/** Un seul relevé de l'équipe par ingrédient, unité et type de lieu ; sa date est remise à jour. */
async function enregistrerPrix(
  ingredientId: string,
  unitId: string,
  placeType: IngredientDepart["prices"][number]["placeType"],
  priceFcfa: number,
) {
  const where = {
    ingredientId,
    unitId,
    placeType,
    city: ville,
    source: "team" as const,
    storeId: null,
  };
  const existant = await prisma.price.findFirst({ where });
  const data = { priceFcfa, observedAt: new Date() };
  if (existant) {
    await prisma.price.update({ where: { id: existant.id }, data });
  } else {
    await prisma.price.create({ data: { ...where, ...data } });
  }
}

type Catalogue = Map<string, { id: string; unites: UnitesParLabel }>;

/** Recette retrouvée par son titre ; ses ingrédients sont remplacés à chaque passage. */
async function enregistrerRecette(recette: RecetteDepart, catalogue: Catalogue) {
  const { ingredients, reference, ...champs } = recette;
  const lignes = ingredients.map((ligne) => {
    const ingredient = catalogue.get(ligne.name)!;
    return {
      ingredientId: ingredient.id,
      unitId: ingredient.unites.get(ligne.unit)!,
      quantity: ligne.quantity,
      optional: ligne.optional ?? false,
    };
  });
  const data = { ...champs, source: "team" as const };

  const existante = await prisma.recipe.findFirst({
    where: { title: recette.title, source: "team" },
  });

  await prisma.$transaction(async (tx) => {
    if (existante) {
      await tx.recipe.update({ where: { id: existante.id }, data });
      await tx.recipeIngredient.deleteMany({ where: { recipeId: existante.id } });
      await tx.recipeIngredient.createMany({
        data: lignes.map((ligne) => ({ ...ligne, recipeId: existante.id })),
      });
    } else {
      await tx.recipe.create({ data: { ...data, ingredients: { create: lignes } } });
    }
  });
  // La référence reste dans donnees-depart.ts : le schéma n'a pas de champ pour elle.
  void reference;
}

async function main() {
  const generiques: UnitesParLabel = new Map();
  for (const unite of unitesGeneriques) {
    const enregistree = await enregistrerUnite(null, unite.label, unite.grams);
    generiques.set(unite.label, enregistree.id);
  }

  const catalogue: Catalogue = new Map();
  for (const ingredient of ingredientsDepart) {
    catalogue.set(ingredient.name, await enregistrerIngredient(ingredient, generiques));
  }

  for (const recette of recettesDepart) {
    await enregistrerRecette(recette, catalogue);
  }

  console.log(
    `Catalogue prêt : ${unitesGeneriques.length} unités génériques, ` +
      `${ingredientsDepart.length} ingrédients, ${recettesDepart.length} recettes.`,
  );
}

main()
  .catch((erreur: unknown) => {
    console.error("Le remplissage de la base a échoué.", erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
