import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerEcriture } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";
import { prisma } from "@/lib/db";

const schemaPatch = z.object({
  status: z.enum(["confirmed", "delivering", "delivered", "cancelled"]),
});

const TRANSITIONS_VALIDES: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["delivering", "cancelled"],
  delivering: ["delivered", "cancelled"],
};

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
        items: {
          include: {
            ingredient: true,
            unit: true,
          },
        },
      },
    });
    if (!order) throw new ErreurApi("INTROUVABLE");

    const permises = TRANSITIONS_VALIDES[order.status] ?? [];
    if (!permises.includes(body.status)) {
      throw new ErreurApi(
        "DONNEESINVALIDES",
        `Transition ${order.status} → ${body.status} non autorisée.`,
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.deliveryOrder.update({
        where: { id },
        data: { status: body.status },
      });

      if (body.status === "delivered") {
        for (const item of order.items) {
          const grams = item.unit.gramsEquivalent * item.quantity;

          const existant = await tx.stockItem.findFirst({
            where: {
              householdId: session.householdId!,
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
                reference: `delivery:${order.id}`,
              },
            });
          } else {
            const nouveau = await tx.stockItem.create({
              data: {
                householdId: session.householdId!,
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
                reference: `delivery:${order.id}`,
              },
            });
          }

          await tx.shoppingListItem.updateMany({
            where: {
              ingredientId: item.ingredientId,
              checked: false,
              list: { householdId: session.householdId! },
            },
            data: { checked: true },
          });
        }
      }

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
      }
    });

    return NextResponse.json({ id, status: body.status });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
