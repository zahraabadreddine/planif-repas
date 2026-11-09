import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { prisma } from "@/lib/db";
import { creerProposition } from "@/lib/agent/proposals";
import type { ContexteOutil, OutilAgent } from "./types";

const schema = z
  .object({
    repasId: z.string().uuid().describe("Identifiant du repas à remplacer"),
    recetteId: z.string().uuid().describe("Identifiant de la nouvelle recette"),
  })
  .strict();

type Input = z.infer<typeof schema>;

async function executer(session: SessionVerifiee, input: Input, contexte: ContexteOutil) {
  const [repas, recette] = await Promise.all([
    prisma.plannedMeal.findUnique({
      where: { id: input.repasId },
      include: {
        recipe: { select: { title: true } },
        mealPlan: { select: { householdId: true } },
      },
    }),
    prisma.recipe.findUnique({
      where: { id: input.recetteId },
      select: { id: true, title: true, prepMinutes: true, cookMinutes: true, validated: true },
    }),
  ]);

  if (!repas || repas.mealPlan.householdId !== session.householdId) {
    return { erreur: "Repas introuvable dans ton menu." };
  }
  if (!recette || !recette.validated) {
    return { erreur: "Recette introuvable ou non validée." };
  }

  const proposition = await creerProposition(contexte.conversationId, "mealChange", {
    repasId: input.repasId,
    ancienneRecette: repas.recipe.title,
    nouvelleRecetteId: recette.id,
    nouvelleRecette: recette.title,
    minutes: recette.prepMinutes + recette.cookMinutes,
  });

  return {
    propositionId: proposition.id,
    type: proposition.type,
    statut: proposition.status,
    expireA: proposition.expiresAt,
    ancien: repas.recipe.title,
    nouveau: recette.title,
    minutes: recette.prepMinutes + recette.cookMinutes,
    message: `Je propose de remplacer « ${repas.recipe.title} » par « ${recette.title} ». Confirme pour appliquer.`,
  };
}

export const proposeMealChange: OutilAgent<typeof schema> = {
  nom: "proposeMealChange",
  description:
    "Propose de remplacer un repas du menu par une autre recette. Le code revérifie allergies et budget à la confirmation.",
  schema,
  executer,
};
