import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { prixSchema } from "@/lib/validation/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(requete: Request, { params }: Params) {
  try {
    await exigerAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const prix = await prisma.price.findUnique({
      where: { id },
      include: { ingredient: true, unit: true, store: true },
    });
    if (!prix) throw new ErreurApi("INTROUVABLE");
    return NextResponse.json({ price: prix });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

export async function PUT(requete: Request, { params }: Params) {
  try {
    const session = await exigerAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const existant = await prisma.price.findUnique({ where: { id } });
    if (!existant) throw new ErreurApi("INTROUVABLE");

    const corps = prixSchema.parse(await requete.json());
    const prix = await prisma.price.update({
      where: { id },
      data: { ...corps, reportedById: session.userId },
      include: { ingredient: true, unit: true, store: true },
    });
    return NextResponse.json({ price: prix });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

export async function DELETE(requete: Request, { params }: Params) {
  try {
    await exigerAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const existant = await prisma.price.findUnique({ where: { id } });
    if (!existant) throw new ErreurApi("INTROUVABLE");

    await prisma.price.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
