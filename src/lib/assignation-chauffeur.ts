import { prisma } from "@/lib/db";

/**
 * Trouve le chauffeur disponible le plus proche (même commune que le point de livraison)
 * et l'assigne automatiquement à la commande.
 * Retourne le chauffeur assigné ou null si aucun n'est disponible.
 */
export async function assignerChauffeurAutomatique(commandeId: string) {
  const commande = await prisma.deliveryOrder.findUnique({
    where: { id: commandeId },
    include: { deliveryPoint: { select: { commune: true } }, driver: true },
  });

  if (!commande) return null;
  if (commande.driverId) return null;
  if (commande.status !== "pending" && commande.status !== "confirmed") return null;

  const communeCible = commande.deliveryPoint.commune.toLowerCase();

  // Priorité 1 : chauffeur disponible dans la même commune
  let chauffeur = await prisma.driver.findFirst({
    where: {
      status: "available",
      commune: { equals: communeCible, mode: "insensitive" },
    },
    orderBy: { updatedAt: "asc" },
  });

  // Priorité 2 : n'importe quel chauffeur disponible
  if (!chauffeur) {
    chauffeur = await prisma.driver.findFirst({
      where: { status: "available" },
      orderBy: { updatedAt: "asc" },
    });
  }

  if (!chauffeur) return null;

  await prisma.$transaction([
    prisma.deliveryOrder.update({
      where: { id: commandeId },
      data: { driverId: chauffeur.id, status: "confirmed" },
    }),
    prisma.driver.update({
      where: { id: chauffeur.id },
      data: { status: "busy" },
    }),
  ]);

  return chauffeur;
}
