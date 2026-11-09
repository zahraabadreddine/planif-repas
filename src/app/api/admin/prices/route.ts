import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { prixSchema } from "@/lib/validation/admin";

export async function GET() {
  try {
    await exigerAdmin();
    const prix = await prisma.price.findMany({
      include: { ingredient: true, unit: true, store: true },
      orderBy: { observedAt: "desc" },
    });
    return NextResponse.json({ prices: prix });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

export async function POST(requete: Request) {
  try {
    const session = await exigerAdmin();
    const corps = prixSchema.parse(await requete.json());
    const prix = await prisma.price.create({
      data: { ...corps, reportedById: session.userId },
      include: { ingredient: true, unit: true, store: true },
    });
    return NextResponse.json({ price: prix }, { status: 201 });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
