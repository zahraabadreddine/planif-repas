import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerEcriture, exigerSession } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";
import { prisma } from "@/lib/db";

const schemaCommande = z.object({
  deliveryPointId: z.string().min(1),
  type: z.enum(["delivery", "pickup"]),
  items: z
    .array(
      z.object({
        ingredientId: z.string().min(1),
        unitId: z.string().min(1),
        quantity: z.number().positive(),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    const session = await exigerEcriture();
    if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

    const body = schemaCommande.parse(await request.json());

    const point = await prisma.deliveryPoint.findUnique({
      where: { id: body.deliveryPointId, status: "active" },
    });
    if (!point) throw new ErreurApi("INTROUVABLE");

    let totalProduits = 0;
    for (const item of body.items) {
      const stock = await prisma.deliveryStock.findUnique({
        where: {
          deliveryPointId_ingredientId_unitId: {
            deliveryPointId: body.deliveryPointId,
            ingredientId: item.ingredientId,
            unitId: item.unitId,
          },
        },
      });
      if (!stock || stock.quantity < item.quantity) {
        throw new ErreurApi("DONNEESINVALIDES", "Stock insuffisant pour un des produits.");
      }
      totalProduits += stock.priceFcfa * item.quantity;
    }

    const fraisLivraison = body.type === "delivery" ? point.deliveryFeeFcfa : 0;
    const totalFcfa = totalProduits + fraisLivraison;

    const order = await prisma.$transaction(async (tx) => {
      const commande = await tx.deliveryOrder.create({
        data: {
          household: { connect: { id: session.householdId! } },
          deliveryPoint: { connect: { id: body.deliveryPointId } },
          type: body.type,
          deliveryFeeFcfa: fraisLivraison,
          totalFcfa,
          status: "pending",
          items: {
            create: body.items.map((item) => ({
              ingredient: { connect: { id: item.ingredientId } },
              unit: { connect: { id: item.unitId } },
              quantity: item.quantity,
              priceFcfa: 0,
            })),
          },
        },
      });

      for (const item of body.items) {
        const stock = await tx.deliveryStock.findUnique({
          where: {
            deliveryPointId_ingredientId_unitId: {
              deliveryPointId: body.deliveryPointId,
              ingredientId: item.ingredientId,
              unitId: item.unitId,
            },
          },
        });
        if (!stock || stock.quantity < item.quantity) {
          throw new ErreurApi("DONNEESINVALIDES", "Stock insuffisant.");
        }

        const orderItem = await tx.deliveryOrderItem.findFirst({
          where: { orderId: commande.id, ingredientId: item.ingredientId },
        });
        if (orderItem) {
          await tx.deliveryOrderItem.update({
            where: { id: orderItem.id },
            data: { priceFcfa: stock.priceFcfa },
          });
        }

        await tx.deliveryStock.update({
          where: {
            deliveryPointId_ingredientId_unitId: {
              deliveryPointId: body.deliveryPointId,
              ingredientId: item.ingredientId,
              unitId: item.unitId,
            },
          },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      return commande;
    });

    return NextResponse.json({ id: order.id, totalFcfa, status: order.status }, { status: 201 });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

export async function GET() {
  try {
    const session = await exigerSession();
    if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

    const orders = await prisma.deliveryOrder.findMany({
      where: { householdId: session.householdId },
      include: {
        deliveryPoint: { select: { name: true, address: true } },
        items: {
          include: {
            ingredient: { select: { name: true } },
            unit: { select: { label: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(orders);
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
