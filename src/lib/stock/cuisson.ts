import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";

// Marquer un repas cuisiné et déduire le stock (EF-14).
// Un mouvement `cooked` par ingrédient ; si le stock est insuffisant,
// on retire ce qui existe et on ne passe jamais sous zéro (règle 5).
// La conversion passe par les grammes (gramsEquivalent) pour comparer
// des unités différentes entre la recette et le stock.

export type ResultatCuisson = {
  plannedMealId: string;
  recipeName: string;
  deductions: { ingredientName: string; quantity: number; unitLabel: string }[];
};

export async function marquerCuisine(
  session: SessionVerifiee,
  plannedMealId: string,
): Promise<ResultatCuisson> {
  const householdId = session.householdId;
  if (!householdId) throw new ErreurApi("FOYERMANQUANT");

  const repas = await prisma.plannedMeal.findUnique({
    where: { id: plannedMealId },
    include: {
      mealPlan: { select: { householdId: true } },
      recipe: {
        include: {
          ingredients: {
            where: { optional: false },
            include: {
              ingredient: { select: { name: true } },
              unit: { select: { label: true, gramsEquivalent: true } },
            },
          },
        },
      },
    },
  });

  if (!repas) throw new ErreurApi("INTROUVABLE");
  if (repas.mealPlan.householdId !== householdId) throw new ErreurApi("INTERDIT");

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.plannedMeal.updateMany({
      where: { id: repas.id, status: { not: "cooked" } },
      data: { status: "cooked" },
    });
    if (updated.count === 0) {
      throw new ErreurApi("DONNEESINVALIDES", "Ce repas est déjà marqué comme cuisiné.");
    }

    const deductions: ResultatCuisson["deductions"] = [];

    for (const ri of repas.recipe.ingredients) {
      const quantiteRecette = ri.quantity * (repas.servings / repas.recipe.servings);
      const gramsNecessaires = quantiteRecette * ri.unit.gramsEquivalent;

      const stockItems = await tx.stockItem.findMany({
        where: {
          householdId,
          ingredientId: ri.ingredientId,
          status: { in: ["ok", "useSoon"] },
          quantity: { gt: 0 },
        },
        include: { unit: { select: { gramsEquivalent: true } } },
        orderBy: { expiresAt: "asc" },
      });

      let gramsRestant = gramsNecessaires;

      for (const item of stockItems) {
        if (gramsRestant <= 0) break;

        const gramsDisponibles = item.quantity * item.unit.gramsEquivalent;
        const gramsARetirer = Math.min(gramsRestant, gramsDisponibles);
        const quantiteARetirer = gramsARetirer / item.unit.gramsEquivalent;
        const nouvelleQuantite = item.quantity - quantiteARetirer;

        await tx.stockMovement.create({
          data: {
            stockItemId: item.id,
            type: "cooked",
            quantity: -quantiteARetirer,
            grams: -gramsARetirer,
            reference: repas.id,
          },
        });
        await tx.stockItem.update({
          where: { id: item.id },
          data: {
            quantity: Math.max(nouvelleQuantite, 0),
            status: nouvelleQuantite <= 0 ? "used" : item.status,
          },
        });

        gramsRestant -= gramsARetirer;
      }

      const gramsDeduits = gramsNecessaires - gramsRestant;
      if (gramsDeduits > 0) {
        deductions.push({
          ingredientName: ri.ingredient.name,
          quantity: gramsDeduits / ri.unit.gramsEquivalent,
          unitLabel: ri.unit.label,
        });
      }
    }

    return {
      plannedMealId: repas.id,
      recipeName: repas.recipe.title,
      deductions,
    };
  });
}
