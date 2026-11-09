import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { ingredientSchema } from "@/lib/validation/admin";

export async function GET() {
  try {
    await exigerAdmin();
    const ingredients = await prisma.ingredient.findMany({
      include: { units: true, defaultUnit: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ ingredients });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

export async function POST(requete: Request) {
  try {
    await exigerAdmin();
    const corps = ingredientSchema.parse(await requete.json());
    const ingredient = await prisma.ingredient.create({
      data: corps,
      include: { units: true, defaultUnit: true },
    });
    return NextResponse.json({ ingredient }, { status: 201 });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
