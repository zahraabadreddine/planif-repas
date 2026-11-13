import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerChauffeur } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";
import { assignerChauffeurAutomatique } from "@/lib/assignation-chauffeur";

const schema = z.object({
  status: z.enum(["available", "offline"]),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await exigerChauffeur();

    const driver = await prisma.driver.findUnique({
      where: { userId: session.userId },
    });
    if (!driver) throw new ErreurApi("INTROUVABLE", "Profil chauffeur introuvable.");

    if (driver.status === "busy") {
      throw new ErreurApi(
        "INTERDIT",
        "Tu as une livraison en cours. Termine-la avant de changer ton statut.",
      );
    }

    const body = schema.parse(await req.json());

    const maj = await prisma.driver.update({
      where: { id: driver.id },
      data: { status: body.status },
    });

    if (body.status === "available") {
      const pending = await prisma.deliveryOrder.findMany({
        where: { status: "pending", driverId: null },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      for (const commande of pending) {
        const result = await assignerChauffeurAutomatique(commande.id);
        if (result) break;
      }
    }

    const refreshed = await prisma.driver.findUnique({ where: { id: driver.id } });

    return NextResponse.json({ status: refreshed?.status ?? maj.status });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
