import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { magasinSchema } from "@/lib/validation/admin";

export async function GET() {
  try {
    await exigerAdmin();
    const magasins = await prisma.store.findMany({
      include: { neighborhood: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ stores: magasins });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

export async function POST(requete: Request) {
  try {
    await exigerAdmin();
    const corps = magasinSchema.parse(await requete.json());
    const { openingHours, ...reste } = corps;
    const magasin = await prisma.store.create({
      data: {
        ...reste,
        openingHours: openingHours === null ? Prisma.JsonNull : openingHours,
      },
      include: { neighborhood: true },
    });
    return NextResponse.json({ store: magasin }, { status: 201 });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
