import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { prisma } from "@/lib/db";
import { equivalence, unitesAchat } from "@/lib/stock/unites-achat";

// GET /api/ingredients : ingrédients du catalogue et unités pour déclarer un achat (EF-13).
// Chaque unité donne son équivalence (« 1 tas ≈ 250 g ») ; le kg est proposé en plus.
export async function GET() {
  try {
    await exigerSession();

    const [ingredients, kg] = await Promise.all([
      prisma.ingredient.findMany({
        select: {
          id: true,
          name: true,
          category: true,
          defaultUnitId: true,
          units: { select: { id: true, label: true, gramsEquivalent: true } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.marketUnit.findFirst({
        where: { ingredientId: null, label: "kg" },
        select: { id: true, label: true, gramsEquivalent: true },
      }),
    ]);

    const versUnite = (u: { id: string; label: string; gramsEquivalent: number }) => ({
      id: u.id,
      label: u.label,
      grams: u.gramsEquivalent,
    });

    return NextResponse.json(
      ingredients.map((ingredient) => ({
        id: ingredient.id,
        name: ingredient.name,
        category: ingredient.category,
        defaultUnitId: ingredient.defaultUnitId,
        units: unitesAchat(ingredient.units.map(versUnite), kg ? versUnite(kg) : null).map(
          (unite) => ({ ...unite, equivalence: equivalence(unite) }),
        ),
      })),
    );
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
