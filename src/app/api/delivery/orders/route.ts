import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerEcriture, exigerSession } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";
import { prisma } from "@/lib/db";
import { assignerChauffeurAutomatique } from "@/lib/assignation-chauffeur";

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

type ItemAggrege = { ingredientId: string; unitId: string; quantity: number };

function agregerItems(
  items: { ingredientId: string; unitId: string; quantity: number }[],
): ItemAggrege[] {
  const carte = new Map<string, ItemAggrege>();
  for (const item of items) {
    const cle = `${item.ingredientId}:${item.unitId}`;
    const existant = carte.get(cle);
    if (existant) {
      existant.quantity += item.quantity;
    } else {
      carte.set(cle, { ...item });
    }
  }
  return [...carte.values()];
}

export async function POST(request: Request) {
  try {
    const session = await exigerEcriture();
    if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

    const body = schemaCommande.parse(await request.json());
    const itemsAgreges = agregerItems(body.items);

    const point = await prisma.deliveryPoint.findUnique({
      where: { id: body.deliveryPointId, status: "active" },
    });
    if (!point) throw new ErreurApi("INTROUVABLE");

    const fraisLivraison = body.type === "delivery" ? point.deliveryFeeFcfa : 0;

    const order = await prisma.$transaction(async (tx) => {
      let totalProduits = 0;
      const itemsAvecPrix: (ItemAggrege & { priceFcfa: number })[] = [];

      for (const item of itemsAgreges) {
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
          throw new ErreurApi(
            "DONNEESINVALIDES",
            "Stock insuffisant pour un des produits.",
          );
        }

        const prixLigne = Math.round(stock.priceFcfa * item.quantity);
        totalProduits += prixLigne;
        itemsAvecPrix.push({ ...item, priceFcfa: prixLigne });

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

      const totalFcfa = totalProduits + fraisLivraison;

      const commande = await tx.deliveryOrder.create({
        data: {
          household: { connect: { id: session.householdId! } },
          deliveryPoint: { connect: { id: body.deliveryPointId } },
          type: body.type,
          deliveryFeeFcfa: fraisLivraison,
          totalFcfa,
          status: "pending",
          items: {
            create: itemsAvecPrix.map((item) => ({
              ingredient: { connect: { id: item.ingredientId } },
              unit: { connect: { id: item.unitId } },
              quantity: item.quantity,
              priceFcfa: item.priceFcfa,
            })),
          },
        },
      });

      return commande;
    });

    try {
      await assignerChauffeurAutomatique(order.id);
    } catch (erreur) {
      console.error(
        `Assignation automatique échouée pour la commande ${order.id} :`,
        erreur,
      );
    }

    const commandeFinale = await prisma.deliveryOrder.findUniqueOrThrow({
      where: { id: order.id },
      select: { id: true, totalFcfa: true, status: true },
    });

    return NextResponse.json(commandeFinale, { status: 201 });
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
