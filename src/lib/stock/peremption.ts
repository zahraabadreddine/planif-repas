import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";

// Rafraîchissement des alertes de péremption (EF-15).
// À chaque ouverture de l'accueil, les articles à moins de 2 jours
// de expiresAt passent de « ok » à « useSoon ».
// La lecture (listerAlertes) n'écrit jamais : seul rafraichirPeremption met à jour les statuts.

export type AlertePeremption = {
  id: string;
  ingredientName: string;
  quantity: number;
  unitLabel: string;
  expiresAt: string;
  joursRestants: number;
};

/** Liste les articles « useSoon » du foyer, sans rien modifier en base. */
export async function listerAlertes(session: SessionVerifiee): Promise<AlertePeremption[]> {
  const householdId = session.householdId;
  if (!householdId) throw new ErreurApi("FOYERMANQUANT");

  const maintenant = new Date();
  const articles = await prisma.stockItem.findMany({
    where: {
      householdId,
      status: "useSoon",
      quantity: { gt: 0 },
    },
    include: {
      ingredient: { select: { name: true } },
      unit: { select: { label: true } },
    },
    orderBy: { expiresAt: "asc" },
  });

  return articles
    .filter((a) => a.expiresAt !== null)
    .map((a) => {
      const expiration = a.expiresAt as Date;
      const diffMs = expiration.getTime() - maintenant.getTime();
      const joursRestants = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return {
        id: a.id,
        ingredientName: a.ingredient.name,
        quantity: a.quantity,
        unitLabel: a.unit.label,
        expiresAt: expiration.toISOString(),
        joursRestants,
      };
    });
}

/** Passe en « useSoon » les articles à moins de 2 jours de péremption, puis renvoie les alertes. */
export async function rafraichirPeremption(
  session: SessionVerifiee,
): Promise<{ misAJour: number; alertes: AlertePeremption[] }> {
  const householdId = session.householdId;
  if (!householdId) throw new ErreurApi("FOYERMANQUANT");

  const dansDeuxJours = new Date();
  dansDeuxJours.setDate(dansDeuxJours.getDate() + 2);

  const { count } = await prisma.stockItem.updateMany({
    where: {
      householdId,
      status: "ok",
      quantity: { gt: 0 },
      expiresAt: { not: null, lte: dansDeuxJours },
    },
    data: { status: "useSoon" },
  });

  const alertes = await listerAlertes(session);
  return { misAJour: count, alertes };
}
