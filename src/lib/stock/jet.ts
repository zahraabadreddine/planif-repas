import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";

// Déclarer un produit jeté (EF-14).
// Crée un mouvement `thrown` avec l'équivalent en grammes (sert à mesurer le gaspillage).
// Ne passe jamais sous zéro (règle 5).

export type ResultatJet = {
  stockItemId: string;
  ingredientName: string;
  quantiteJetee: number;
  quantiteRestante: number;
  unitLabel: string;
};

export async function declarerJet(
  session: SessionVerifiee,
  stockItemId: string,
  quantiteJetee: number,
): Promise<ResultatJet> {
  const householdId = session.householdId;
  if (!householdId) throw new ErreurApi("FOYERMANQUANT");

  return prisma.$transaction(async (tx) => {
    const article = await tx.stockItem.findUnique({
      where: { id: stockItemId },
      include: {
        ingredient: { select: { name: true } },
        unit: { select: { label: true, gramsEquivalent: true } },
      },
    });

    if (!article) throw new ErreurApi("INTROUVABLE");
    if (article.householdId !== householdId) throw new ErreurApi("INTERDIT");

    const retiree = Math.min(quantiteJetee, article.quantity);
    const quantiteRestante = article.quantity - retiree;
    const grams = retiree * article.unit.gramsEquivalent;
    const nouveauStatut = quantiteRestante <= 0 ? "thrown" : article.status;

    await tx.stockMovement.create({
      data: {
        stockItemId: article.id,
        type: "thrown",
        quantity: retiree,
        grams,
      },
    });
    await tx.stockItem.update({
      where: { id: article.id },
      data: {
        quantity: quantiteRestante,
        status: nouveauStatut,
      },
    });

    return {
      stockItemId: article.id,
      ingredientName: article.ingredient.name,
      quantiteJetee: retiree,
      quantiteRestante,
      unitLabel: article.unit.label,
    };
  });
}
