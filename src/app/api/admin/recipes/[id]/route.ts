import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { recetteUpdateSchema } from "@/lib/validation/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(requete: Request, { params }: Params) {
  try {
    await exigerAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const recette = await prisma.recipe.findFirst({
      where: { id, householdId: null },
      include: {
        ingredients: {
          include: { ingredient: true, unit: true },
        },
      },
    });
    if (!recette) throw new ErreurApi("INTROUVABLE");
    return NextResponse.json({ recipe: recette });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

export async function PUT(requete: Request, { params }: Params) {
  try {
    await exigerAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const existante = await prisma.recipe.findFirst({ where: { id, householdId: null } });
    if (!existante) throw new ErreurApi("INTROUVABLE");

    const corps = recetteUpdateSchema.parse(await requete.json());
    const { ingredients, ...donnees } = corps;

    const recette = await prisma.$transaction(async (tx) => {
      await tx.recipe.update({ where: { id }, data: donnees });
      if (ingredients !== undefined) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
        if (ingredients.length > 0) {
          await tx.recipeIngredient.createMany({
            data: ingredients.map((ing) => ({
              recipeId: id,
              ingredientId: ing.ingredientId,
              unitId: ing.unitId,
              quantity: ing.quantity,
              optional: ing.optional,
            })),
          });
        }
      }
      return tx.recipe.findUnique({
        where: { id },
        include: {
          ingredients: {
            include: { ingredient: true, unit: true },
          },
        },
      });
    });

    return NextResponse.json({ recipe: recette });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

export async function DELETE(requete: Request, { params }: Params) {
  try {
    await exigerAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const existante = await prisma.recipe.findFirst({ where: { id, householdId: null } });
    if (!existante) throw new ErreurApi("INTROUVABLE");

    await prisma.recipe.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
