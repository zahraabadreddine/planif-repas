import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";

export async function GET(request: Request) {
  try {
    await exigerAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const commandes = await prisma.deliveryOrder.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        household: { select: { name: true } },
        deliveryPoint: { select: { name: true, address: true, commune: true } },
        driver: {
          select: { id: true, phone: true, commune: true, user: { select: { fullName: true } } },
        },
        items: {
          include: {
            ingredient: { select: { name: true } },
            unit: { select: { label: true } },
          },
        },
      },
    });

    return NextResponse.json({ commandes });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
