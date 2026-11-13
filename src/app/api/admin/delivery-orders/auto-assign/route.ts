import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { assignerChauffeurAutomatique } from "@/lib/assignation-chauffeur";

export async function POST() {
  try {
    await exigerAdmin();

    const enAttente = await prisma.deliveryOrder.findMany({
      where: { status: "pending", driverId: null },
      select: { id: true },
    });

    const resultats: { commandeId: string; chauffeurId: string | null }[] = [];

    for (const commande of enAttente) {
      const chauffeur = await assignerChauffeurAutomatique(commande.id);
      resultats.push({
        commandeId: commande.id,
        chauffeurId: chauffeur?.id ?? null,
      });
    }

    const assignees = resultats.filter((r) => r.chauffeurId !== null).length;

    return NextResponse.json({
      total: enAttente.length,
      assignees,
      nonAssignees: enAttente.length - assignees,
      resultats,
    });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
