import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";

export async function GET() {
  try {
    await exigerAdmin();

    const [
      utilisateurs,
      foyers,
      recettes,
      recettesValidees,
      ingredients,
      prix,
      magasins,
      menus,
      conversations,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.household.count(),
      prisma.recipe.count({ where: { householdId: null } }),
      prisma.recipe.count({ where: { validated: true, householdId: null } }),
      prisma.ingredient.count(),
      prisma.price.count(),
      prisma.store.count(),
      prisma.mealPlan.count(),
      prisma.conversation.count(),
    ]);

    return NextResponse.json({
      stats: {
        utilisateurs,
        foyers,
        recettes,
        recettesValidees,
        ingredients,
        prix,
        magasins,
        menus,
        conversations,
      },
    });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
