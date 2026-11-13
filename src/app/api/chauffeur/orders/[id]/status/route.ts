import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerChauffeur } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";
import { transitionAutorisee, mettreAJourStatutAvecVerrou } from "@/lib/delivery/transitions";
import { crediterStockLivraison } from "@/lib/delivery/crediter-stock";

const schema = z.object({
  status: z.enum(["delivering", "delivered"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await exigerChauffeur();
    const { id } = await params;
    const body = schema.parse(await request.json());

    const driver = await prisma.driver.findUnique({ where: { userId: session.userId } });
    if (!driver) throw new ErreurApi("INTROUVABLE", "Profil chauffeur introuvable.");

    const commande = await prisma.deliveryOrder.findUnique({
      where: { id },
      include: {
        items: { include: { ingredient: true, unit: true } },
      },
    });
    if (!commande) throw new ErreurApi("INTROUVABLE");
    if (commande.driverId !== driver.id) throw new ErreurApi("INTERDIT");

    if (!transitionAutorisee(commande.status, body.status, "chauffeur")) {
      throw new ErreurApi(
        "DONNEESINVALIDES",
        `Transition ${commande.status} → ${body.status} non autorisée.`,
      );
    }

    await prisma.$transaction(async (tx) => {
      await mettreAJourStatutAvecVerrou(tx, id, commande.status, body.status);

      if (body.status === "delivering") {
        await tx.driver.update({
          where: { id: driver.id },
          data: { status: "busy" },
        });
      }

      if (body.status === "delivered") {
        await tx.driver.update({
          where: { id: driver.id },
          data: { status: "available" },
        });
        await crediterStockLivraison(tx, commande.householdId, commande.id, commande.items);
      }
    });

    return NextResponse.json({ id, status: body.status });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
