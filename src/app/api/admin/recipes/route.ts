import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { recetteSchema } from "@/lib/validation/admin";

export async function GET() {
  try {
    await exigerAdmin();
    const recettes = await prisma.recipe.findMany({
      include: {
        ingredients: {
          include: { ingredient: true, unit: true },
        },
      },
      orderBy: { title: "asc" },
    });
    return NextResponse.json({ recipes: recettes });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

export async function POST(requete: Request) {
  try {
    await exigerAdmin();
    const corps = recetteSchema.parse(await requete.json());
    const { ingredients, ...donnees } = corps;

    const recette = await prisma.$transaction(async (tx) => {
      const created = await tx.recipe.create({ data: donnees });
      if (ingredients && ingredients.length > 0) {
        await tx.recipeIngredient.createMany({
          data: ingredients.map((ing) => ({
            recipeId: created.id,
            ingredientId: ing.ingredientId,
            unitId: ing.unitId,
            quantity: ing.quantity,
            optional: ing.optional,
          })),
        });
      }
      return tx.recipe.findUnique({
        where: { id: created.id },
        include: {
          ingredients: {
            include: { ingredient: true, unit: true },
          },
        },
      });
    });

    return NextResponse.json({ recipe: recette }, { status: 201 });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
