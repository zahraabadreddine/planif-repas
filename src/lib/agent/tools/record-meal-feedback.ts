import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { prisma } from "@/lib/db";
import { ErreurApi } from "@/lib/erreurs";
import type { ContexteOutil, OutilAgent } from "./types";

const schema = z
  .object({
    plannedMealId: z.string().uuid().describe("Identifiant du repas planifié"),
    cooked: z.boolean().describe("Le repas a-t-il été cuisiné ?"),
    liked: z
      .number()
      .int()
      .min(1)
      .max(3)
      .optional()
      .describe("Note : 1 = pas aimé, 2 = bof, 3 = aimé"),
    leftovers: z
      .boolean()
      .optional()
      .describe("Y a-t-il eu des restes ?"),
    comment: z
      .string()
      .max(500)
      .optional()
      .describe("Commentaire libre de la famille"),
  })
  .strict();

type Input = z.infer<typeof schema>;

async function executer(
  session: SessionVerifiee,
  input: Input,
  _contexte: ContexteOutil,
) {
  const repas = await prisma.plannedMeal.findUnique({
    where: { id: input.plannedMealId },
    include: {
      mealPlan: { select: { householdId: true } },
      recipe: { select: { title: true } },
    },
  });

  if (!repas || repas.mealPlan.householdId !== session.householdId) {
    throw new ErreurApi("INTROUVABLE");
  }

  const feedback = await prisma.mealFeedback.create({
    data: {
      plannedMealId: input.plannedMealId,
      userId: session.userId,
      cooked: input.cooked,
      liked: input.liked ?? null,
      leftovers: input.leftovers ?? false,
      comment: input.comment ?? null,
    },
  });

  return {
    feedbackId: feedback.id,
    recette: repas.recipe.title,
    cuisine: input.cooked,
    note: input.liked ?? null,
    restes: input.leftovers ?? false,
    message: input.cooked
      ? "Merci pour ton retour ! Ça m'aide à mieux te proposer des repas."
      : "Noté, le repas n'a pas été cuisiné. Je garderai ça en tête.",
  };
}

export const recordMealFeedback: OutilAgent<typeof schema> = {
  nom: "recordMealFeedback",
  description:
    "Enregistre le retour de la famille après un repas : cuisiné ou non, note, restes, commentaire. Aide à améliorer les futures propositions.",
  schema,
  executer,
};
