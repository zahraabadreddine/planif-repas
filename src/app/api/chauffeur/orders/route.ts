import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerChauffeur } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";

export async function GET() {
  try {
    const session = await exigerChauffeur();

    const driver = await prisma.driver.findUnique({
      where: { userId: session.userId },
    });
    if (!driver) throw new ErreurApi("INTROUVABLE", "Profil chauffeur introuvable.");

    const commandes = await prisma.deliveryOrder.findMany({
      where: { driverId: driver.id },
      orderBy: { createdAt: "desc" },
      include: {
        household: { select: { name: true } },
        deliveryPoint: { select: { name: true, address: true, commune: true, phone: true } },
        items: {
          include: {
            ingredient: { select: { name: true } },
            unit: { select: { label: true } },
          },
        },
      },
    });

    return NextResponse.json({ commandes, driver: { id: driver.id, status: driver.status } });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
