import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await exigerSession();
    const points = await prisma.deliveryPoint.findMany({
      where: { status: "active" },
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        phone: true,
        deliveryFeeFcfa: true,
        stock: {
          where: { quantity: { gt: 0 } },
          select: {
            ingredientId: true,
            ingredient: { select: { name: true } },
            unit: { select: { label: true } },
            quantity: true,
            priceFcfa: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(points);
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
