import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";

// Marquer un repas cuisiné et déduire le stock (EF-14).
// Un mouvement `cooked` par ingrédient ; si le stock est insuffisant,
// on retire ce qui existe et on ne passe jamais sous zéro (règle 5).

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
  if (repas.status === "cooked") {
    throw new ErreurApi("DONNEESINVALIDES", "Ce repas est déjà marqué comme cuisiné.");
  }

  const deductions: ResultatCuisson["deductions"] = [];

  for (const ri of repas.recipe.ingredients) {
    const quantiteRecette = ri.quantity * (repas.servings / repas.recipe.servings);

    const stockItems = await prisma.stockItem.findMany({
      where: {
        householdId,
        ingredientId: ri.ingredientId,
        status: { in: ["ok", "useSoon"] },
        quantity: { gt: 0 },
      },
      orderBy: { expiresAt: "asc" },
    });

    let restant = quantiteRecette;

    for (const item of stockItems) {
      if (restant <= 0) break;

      const aRetirer = Math.min(restant, item.quantity);
      const nouvelleQuantite = item.quantity - aRetirer;
      const grams = aRetirer * ri.unit.gramsEquivalent;

      await prisma.$transaction([
        prisma.stockMovement.create({
          data: {
            stockItemId: item.id,
            type: "cooked",
            quantity: aRetirer,
            grams,
            reference: repas.id,
          },
        }),
        prisma.stockItem.update({
          where: { id: item.id },
          data: {
            quantity: nouvelleQuantite,
            status: nouvelleQuantite <= 0 ? "used" : item.status,
          },
        }),
      ]);

      restant -= aRetirer;
    }

    const totalDeduit = quantiteRecette - restant;
    if (totalDeduit > 0) {
      deductions.push({
        ingredientName: ri.ingredient.name,
        quantity: totalDeduit,
        unitLabel: ri.unit.label,
      });
    }
  }

  await prisma.plannedMeal.update({
    where: { id: repas.id },
    data: { status: "cooked" },
  });

  return {
    plannedMealId: repas.id,
    recipeName: repas.recipe.title,
    deductions,
  };
}
