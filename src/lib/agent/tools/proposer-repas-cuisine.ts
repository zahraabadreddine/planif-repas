import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { prisma } from "@/lib/db";
import { quandCuisiner, repasArrive } from "@/lib/planificateur/moment";
import type { ContexteOutil, OutilAgent } from "./types";

const schema = z
  .object({
    repasId: z.string().uuid().describe("Identifiant du repas du menu que la famille a cuisiné"),
  })
  .strict();

type Input = z.infer<typeof schema>;

// L'IA ne touche pas au stock (règle 1) : elle montre le bouton, la famille appuie pour confirmer
async function executer(session: SessionVerifiee, input: Input, contexte: ContexteOutil) {
  const repas = await prisma.plannedMeal.findFirst({
    where: { id: input.repasId, mealPlan: { householdId: session.householdId! } },
    include: { recipe: { select: { title: true } }, mealPlan: { select: { status: true } } },
  });
  if (!repas) return { erreur: "Repas introuvable dans ton menu." };
  if (repas.mealPlan.status !== "active") {
    return { erreur: "Ce menu n'est pas encore validé : il faut d'abord le confirmer." };
  }
  if (repas.leftoverFromId) {
    return { erreur: "C'est un repas de restes : il n'y a rien à retirer du stock." };
  }
  if (repas.status === "cooked") {
    return { erreur: "Ce repas est déjà marqué comme cuisiné." };
  }
  const date = repas.date.toISOString().slice(0, 10);
  if (!repasArrive(date, repas.slot)) {
    return {
      erreur: `Ce repas est prévu plus tard : il pourra être marqué cuisiné ${quandCuisiner(date, repas.slot)}. Vérifie avec la famille de quel repas elle parle.`,
    };
  }

  contexte.afficher?.({
    type: "cuisine",
    repas: { id: repas.id, titre: repas.recipe.title, date, creneau: repas.slot },
  });
  return {
    message:
      "La famille voit le repas avec un bouton « C'est cuisiné » : en appuyant, ses ingrédients sortent du stock. Rien n'est encore enregistré : ne dis pas que c'est fait, invite-la en une phrase à appuyer sur le bouton.",
  };
}

export const proposerRepasCuisine: OutilAgent<typeof schema> = {
  nom: "proposerRepasCuisine",
  description:
    "Quand la famille dit avoir cuisiné un repas du menu : affiche ce repas avec un bouton pour le marquer cuisiné, ce qui retire ses ingrédients du stock. Trouve d'abord le repas avec getWeekPlan.",
  schema,
  executer,
};
