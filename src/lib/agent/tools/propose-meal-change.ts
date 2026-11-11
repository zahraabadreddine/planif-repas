import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { prisma } from "@/lib/db";
import { creerProposition } from "@/lib/agent/proposals";
import { PORTIONSMAX } from "@/lib/validation/repas";
import type { ContexteOutil, OutilAgent } from "./types";

// Une seule sorte de changement par proposition (EF-07) : la recette, ou les portions
const schema = z
  .object({
    repasId: z.string().uuid().describe("Identifiant du repas à modifier"),
    recetteId: z.string().uuid().optional().describe("Identifiant de la nouvelle recette"),
    portions: z
      .number()
      .int()
      .min(1)
      .max(PORTIONSMAX)
      .optional()
      .describe(`Nouveau nombre de portions (invités), ${PORTIONSMAX} au plus`),
  })
  .strict()
  .refine((d) => (d.recetteId === undefined) !== (d.portions === undefined), {
    message:
      "Change soit la recette, soit les portions : fais deux propositions pour changer les deux.",
  });

type Input = z.infer<typeof schema>;

async function executer(session: SessionVerifiee, input: Input, contexte: ContexteOutil) {
  const repas = await prisma.plannedMeal.findUnique({
    where: { id: input.repasId },
    include: {
      recipe: { select: { title: true } },
      mealPlan: { select: { householdId: true } },
    },
  });
  if (!repas || repas.mealPlan.householdId !== session.householdId) {
    return { erreur: "Repas introuvable dans ton menu." };
  }

  if (input.portions !== undefined) {
    const proposition = await creerProposition(contexte.conversationId, "mealChange", {
      repasId: input.repasId,
      ancienneRecette: repas.recipe.title,
      portions: input.portions,
      anciennesPortions: repas.servings,
    });
    return {
      propositionId: proposition.id,
      type: proposition.type,
      statut: proposition.status,
      expireA: proposition.expiresAt,
      repas: repas.recipe.title,
      portions: input.portions,
      message: `Je propose de préparer « ${repas.recipe.title} » pour ${input.portions} personnes. Confirme pour appliquer : les quantités et la liste de courses seront recalculées.`,
    };
  }

  const recette = await prisma.recipe.findUnique({
    where: { id: input.recetteId },
    select: { id: true, title: true, prepMinutes: true, cookMinutes: true, validated: true },
  });
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
    "Propose de modifier un repas du menu : soit remplacer sa recette, soit changer son nombre de portions (invités). Le code revérifie allergies et budget à la confirmation.",
  schema,
  executer,
};
