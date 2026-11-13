import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";

const schema = z.object({
  driverId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await exigerAdmin();
    const { id } = await params;
    const body = schema.parse(await request.json());

    const commande = await prisma.deliveryOrder.findUnique({ where: { id } });
    if (!commande) throw new ErreurApi("INTROUVABLE");
    if (commande.status !== "pending" && commande.status !== "confirmed") {
      throw new ErreurApi("DONNEESINVALIDES", "Cette commande ne peut plus être assignée.");
    }

    const chauffeur = await prisma.driver.findUnique({ where: { id: body.driverId } });
    if (!chauffeur) throw new ErreurApi("INTROUVABLE", "Chauffeur introuvable.");

    const updated = await prisma.deliveryOrder.update({
      where: { id },
      data: {
        driverId: body.driverId,
        status: "confirmed",
      },
    });

    await prisma.driver.update({
      where: { id: body.driverId },
      data: { status: "busy" },
    });

    return NextResponse.json({ id: updated.id, status: updated.status, driverId: updated.driverId });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
