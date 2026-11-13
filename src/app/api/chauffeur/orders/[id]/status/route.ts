import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerChauffeur } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";

const schema = z.object({
  status: z.enum(["delivering", "delivered"]),
});

const TRANSITIONS: Record<string, string[]> = {
  confirmed: ["delivering"],
  delivering: ["delivered"],
};

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

    const permises = TRANSITIONS[commande.status] ?? [];
    if (!permises.includes(body.status)) {
      throw new ErreurApi("DONNEESINVALIDES", `Transition ${commande.status} → ${body.status} non autorisée.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.deliveryOrder.update({
        where: { id },
        data: { status: body.status },
      });

      if (body.status === "delivered") {
        await tx.driver.update({
          where: { id: driver.id },
          data: { status: "available" },
        });

        for (const item of commande.items) {
          const grams = item.unit.gramsEquivalent * item.quantity;

          const existant = await tx.stockItem.findFirst({
            where: {
              householdId: commande.householdId,
              ingredientId: item.ingredientId,
              unitId: item.unitId,
              status: "ok",
            },
          });

          if (existant) {
            await tx.stockItem.update({
              where: { id: existant.id },
              data: { quantity: { increment: item.quantity } },
            });
            await tx.stockMovement.create({
              data: {
                stockItemId: existant.id,
                type: "purchase",
                quantity: item.quantity,
                grams,
                reference: `delivery:${commande.id}`,
              },
            });
          } else {
            const nouveau = await tx.stockItem.create({
              data: {
                householdId: commande.householdId,
                ingredientId: item.ingredientId,
                unitId: item.unitId,
                quantity: item.quantity,
                location: "pantry",
                status: "ok",
              },
            });
            await tx.stockMovement.create({
              data: {
                stockItemId: nouveau.id,
                type: "purchase",
                quantity: item.quantity,
                grams,
                reference: `delivery:${commande.id}`,
              },
            });
          }

          await tx.shoppingListItem.updateMany({
            where: {
              ingredientId: item.ingredientId,
              checked: false,
              list: { householdId: commande.householdId },
            },
            data: { checked: true },
          });
        }
      }

      if (body.status === "delivering") {
        await tx.driver.update({
          where: { id: driver.id },
          data: { status: "busy" },
        });
      }
    });

    return NextResponse.json({ id, status: body.status });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
