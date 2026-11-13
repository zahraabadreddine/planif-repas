import type { Prisma, DeliveryOrderStatus } from "@prisma/client";

const TRANSITIONS_FAMILLE: Record<string, string[]> = {
  pending: ["cancelled"],
  confirmed: ["cancelled"],
  delivered: ["received"],
};

const TRANSITIONS_CHAUFFEUR: Record<string, string[]> = {
  confirmed: ["delivering"],
  delivering: ["delivered"],
};

export function transitionAutorisee(
  actuel: string,
  cible: string,
  role: "famille" | "chauffeur",
): boolean {
  const carte = role === "famille" ? TRANSITIONS_FAMILLE : TRANSITIONS_CHAUFFEUR;
  return (carte[actuel] ?? []).includes(cible);
}

export async function mettreAJourStatutAvecVerrou(
  tx: Prisma.TransactionClient,
  commandeId: string,
  ancienStatut: string,
  nouveauStatut: string,
): Promise<void> {
  const { count } = await tx.deliveryOrder.updateMany({
    where: { id: commandeId, status: ancienStatut as DeliveryOrderStatus },
    data: { status: nouveauStatut as DeliveryOrderStatus },
  });
  if (count === 0) {
    throw new Error("Le statut de la commande a changé entre-temps.");
  }
}
