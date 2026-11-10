import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import type { FeedbackDemande } from "@/lib/validation/feedback";

// EF-18 : Retour après chaque repas.
// Règle §3.1 : le code vérifie avant d'écrire.
// Règle §3.4 : le foyer vient de la session.

export type ResultatRetour = {
  id: string;
  plannedMealId: string;
  recipeName: string;
  liked: number | null;
  leftovers: boolean;
  learned: string | null;
};

export async function donnerRetour(
  session: SessionVerifiee,
  plannedMealId: string,
  feedback: FeedbackDemande,
): Promise<ResultatRetour> {
  const householdId = session.householdId;
  if (!householdId) throw new ErreurApi("FOYERMANQUANT");

  const repas = await prisma.plannedMeal.findUnique({
    where: { id: plannedMealId },
    include: {
      mealPlan: { select: { householdId: true } },
      recipe: { select: { id: true, title: true } },
    },
  });

  if (!repas) throw new ErreurApi("INTROUVABLE");
  // Un repas d'un autre foyer est introuvable : on ne révèle pas qu'il existe
  if (repas.mealPlan.householdId !== householdId) throw new ErreurApi("INTROUVABLE");
  if (repas.status !== "cooked") {
    throw new ErreurApi("DONNEESINVALIDES", "Ce repas n'a pas encore été cuisiné.");
  }

  const mealFeedback = await prisma.mealFeedback.create({
    data: {
      plannedMealId,
      userId: session.userId,
      cooked: true,
      liked: feedback.liked,
      leftovers: feedback.leftovers,
      comment: feedback.comment ?? null,
    },
  });

  const learned = await rememberPreference(householdId, repas.recipe.id);

  return {
    id: mealFeedback.id,
    plannedMealId,
    recipeName: repas.recipe.title,
    liked: feedback.liked ?? null,
    leftovers: feedback.leftovers,
    learned,
  };
}

async function rememberPreference(householdId: string, recipeId: string): Promise<string | null> {
  const feedbacks = await prisma.mealFeedback.findMany({
    where: {
      plannedMeal: {
        recipeId,
        mealPlan: { householdId },
      },
      liked: { not: null },
    },
    select: { liked: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (feedbacks.length < 2) return null;

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: { title: true },
  });
  const titre = recipe?.title ?? "ce plat";

  const deuxDerniers = feedbacks.slice(0, 2);
  const tousAiment = deuxDerniers.every((f) => f.liked === 3);
  const tousDetestent = deuxDerniers.every((f) => f.liked === 1);

  if (!tousAiment && !tousDetestent) return null;

  const key = `dish:${recipeId}`;
  const value = tousAiment ? "liked" : "disliked";
  const confidence = 0.8;
  const explanation = tousAiment
    ? `La famille a aimé « ${titre} » deux fois de suite.`
    : `La famille n'a pas aimé « ${titre} » deux fois de suite.`;

  const existante = await prisma.learnedPreference.findFirst({
    where: { householdId, key },
  });

  if (existante) {
    await prisma.learnedPreference.update({
      where: { id: existante.id },
      data: { value, confidence, explanation, active: true },
    });
  } else {
    await prisma.learnedPreference.create({
      data: {
        householdId,
        key,
        value,
        confidence,
        explanation,
        source: "meal-feedback",
        active: true,
      },
    });
  }

  return explanation;
}
