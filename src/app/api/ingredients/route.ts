import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { prisma } from "@/lib/db";

// GET /api/ingredients : liste des ingrédients du catalogue avec leurs unités.
export async function GET() {
  try {
    await exigerSession();

    const ingredients = await prisma.ingredient.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        defaultUnitId: true,
        units: { select: { id: true, label: true }, orderBy: { label: "asc" } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(ingredients);
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
