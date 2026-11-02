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

  const article = await prisma.stockItem.findUnique({
    where: { id: stockItemId },
    include: {
      ingredient: { select: { name: true } },
      unit: { select: { label: true, gramsEquivalent: true } },
    },
  });

  if (!article) throw new ErreurApi("INTROUVABLE");
  if (article.householdId !== householdId) throw new ErreurApi("INTERDIT");

  const delta = nouvelleQuantite - article.quantity;
  if (delta === 0) {
    return {
      stockItemId: article.id,
      ingredientName: article.ingredient.name,
      unitLabel: article.unit.label,
      ancienneQuantite: article.quantity,
      nouvelleQuantite: article.quantity,
    };
  }

  const grams = Math.abs(delta) * article.unit.gramsEquivalent;
  const nouveauStatut = nouvelleQuantite <= 0 ? "used" : article.status;

  await prisma.$transaction([
    prisma.stockMovement.create({
      data: {
        stockItemId: article.id,
        type: "correction",
        quantity: delta,
        grams,
      },
    }),
    prisma.stockItem.update({
      where: { id: article.id },
      data: {
        quantity: nouvelleQuantite,
        status: nouveauStatut,
      },
    }),
  ]);

  return {
    stockItemId: article.id,
    ingredientName: article.ingredient.name,
    unitLabel: article.unit.label,
    ancienneQuantite: article.quantity,
    nouvelleQuantite,
  };
}
