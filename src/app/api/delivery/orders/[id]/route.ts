import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerEcriture } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";
import { prisma } from "@/lib/db";
import { transitionAutorisee, mettreAJourStatutAvecVerrou } from "@/lib/delivery/transitions";

const schemaPatch = z.object({
  status: z.enum(["cancelled", "received"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await exigerEcriture();
    if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

    const { id } = await params;
    const body = schemaPatch.parse(await request.json());

    const order = await prisma.deliveryOrder.findUnique({
      where: { id, householdId: session.householdId },
      include: {
        items: { include: { ingredient: true, unit: true } },
      },
    });
    if (!order) throw new ErreurApi("INTROUVABLE");

    if (!transitionAutorisee(order.status, body.status, "famille")) {
      throw new ErreurApi(
        "DONNEESINVALIDES",
        `Transition ${order.status} → ${body.status} non autorisée.`,
      );
    }

    await prisma.$transaction(async (tx) => {
      await mettreAJourStatutAvecVerrou(tx, id, order.status, body.status);

      if (body.status === "cancelled") {
        for (const item of order.items) {
          await tx.deliveryStock.update({
            where: {
              deliveryPointId_ingredientId_unitId: {
                deliveryPointId: order.deliveryPointId,
                ingredientId: item.ingredientId,
                unitId: item.unitId,
              },
            },
            data: { quantity: { increment: item.quantity } },
          });
        }

        if (order.driverId) {
          await tx.driver.update({
            where: { id: order.driverId },
            data: { status: "available" },
          });
        }
      }
    });

    return NextResponse.json({ id, status: body.status });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
