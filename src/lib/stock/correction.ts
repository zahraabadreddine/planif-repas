import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";

// Corriger la quantité d'un article du stock (EF-14).
// Crée un mouvement `correction` avec le delta (règle 5).

export type ResultatCorrection = {
  stockItemId: string;
  ingredientName: string;
  unitLabel: string;
  ancienneQuantite: number;
  nouvelleQuantite: number;
};

export async function corrigerStock(
  session: SessionVerifiee,
  stockItemId: string,
  nouvelleQuantite: number,
): Promise<ResultatCorrection> {
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
    // Un article d'un autre foyer est introuvable : on ne révèle pas qu'il existe
    if (article.householdId !== householdId) throw new ErreurApi("INTROUVABLE");

    // Arrondi à trois décimales : 2 - 1,1 donne 0,9 et non 0,8999999999999999
    const delta = Math.round((nouvelleQuantite - article.quantity) * 1000) / 1000;
    if (delta === 0) {
      return {
        stockItemId: article.id,
        ingredientName: article.ingredient.name,
        unitLabel: article.unit.label,
        ancienneQuantite: article.quantity,
        nouvelleQuantite: article.quantity,
      };
    }

    // Même signe que la quantité : positif si on en ajoute, négatif si on en retire (règle 5)
    const grams = delta * article.unit.gramsEquivalent;
    const nouveauStatut = nouvelleQuantite <= 0 ? "used" : article.status;

    await tx.stockMovement.create({
      data: {
        stockItemId: article.id,
        type: "correction",
        quantity: delta,
        grams,
      },
    });
    await tx.stockItem.update({
      where: { id: article.id },
      data: {
        quantity: nouvelleQuantite,
        status: nouveauStatut,
      },
    });

    return {
      stockItemId: article.id,
      ingredientName: article.ingredient.name,
      unitLabel: article.unit.label,
      ancienneQuantite: article.quantity,
      nouvelleQuantite,
    };
  });
}
