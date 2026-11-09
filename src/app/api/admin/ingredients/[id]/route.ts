import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { ingredientSchema } from "@/lib/validation/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(requete: Request, { params }: Params) {
  try {
    await exigerAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const ingredient = await prisma.ingredient.findUnique({
      where: { id },
      include: { units: true, defaultUnit: true },
    });
    if (!ingredient) throw new ErreurApi("INTROUVABLE");
    return NextResponse.json({ ingredient });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

export async function PUT(requete: Request, { params }: Params) {
  try {
    await exigerAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const existant = await prisma.ingredient.findUnique({ where: { id } });
    if (!existant) throw new ErreurApi("INTROUVABLE");

    const corps = ingredientSchema.parse(await requete.json());
    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: corps,
      include: { units: true, defaultUnit: true },
    });
    return NextResponse.json({ ingredient });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

export async function DELETE(requete: Request, { params }: Params) {
  try {
    await exigerAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const existant = await prisma.ingredient.findUnique({ where: { id } });
    if (!existant) throw new ErreurApi("INTROUVABLE");

    await prisma.ingredient.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
