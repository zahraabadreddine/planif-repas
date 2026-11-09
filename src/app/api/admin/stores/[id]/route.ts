import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { magasinSchema } from "@/lib/validation/admin";

type Params = { params: Promise<{ id: string }> };

export async function GET(requete: Request, { params }: Params) {
  try {
    await exigerAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const magasin = await prisma.store.findUnique({
      where: { id },
      include: { neighborhood: true },
    });
    if (!magasin) throw new ErreurApi("INTROUVABLE");
    return NextResponse.json({ store: magasin });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

export async function PUT(requete: Request, { params }: Params) {
  try {
    await exigerAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const existant = await prisma.store.findUnique({ where: { id } });
    if (!existant) throw new ErreurApi("INTROUVABLE");

    const corps = magasinSchema.parse(await requete.json());
    const { openingHours, ...reste } = corps;
    const magasin = await prisma.store.update({
      where: { id },
      data: {
        ...reste,
        openingHours: openingHours === null ? Prisma.JsonNull : openingHours,
      },
      include: { neighborhood: true },
    });
    return NextResponse.json({ store: magasin });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

export async function DELETE(requete: Request, { params }: Params) {
  try {
    await exigerAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const existant = await prisma.store.findUnique({ where: { id } });
    if (!existant) throw new ErreurApi("INTROUVABLE");

    await prisma.store.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
