import { prisma } from "@/lib/db";
import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { genererMenu } from "@/lib/planificateur/generation";
import { creerProposition } from "@/lib/agent/proposals";
import type { ContexteOutil, OutilAgent } from "./types";

const schema = z
  .object({
    weekStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Date ISO du lundi de la semaine (défaut : lundi prochain)"),
  })
  .strict();

type Input = z.infer<typeof schema>;

function lundiProchain(): string {
  const maintenant = new Date();
  const jour = maintenant.getDay();
  const diff = jour === 0 ? 1 : 8 - jour;
  const lundi = new Date(maintenant);
  lundi.setDate(lundi.getDate() + diff);
  return lundi.toISOString().slice(0, 10);
}

async function executer(session: SessionVerifiee, input: Input, contexte: ContexteOutil) {
  const weekStartStr = input.weekStart ?? lundiProchain();
  const weekStart = new Date(weekStartStr + "T00:00:00Z");

  const menu = await genererMenu(session, weekStart);

  // Le nouveau brouillon remplace l'ancien : une carte de menu restée en attente ne mènerait plus à rien
  await prisma.agentProposal.updateMany({
    where: {
      type: "weekPlan",
      status: "pending",
      conversation: { householdId: session.householdId! },
    },
    data: { status: "expired" },
  });

  const proposition = await creerProposition(contexte.conversationId, "weekPlan", {
    menuId: menu.id,
    weekStart: weekStartStr,
    estimatedCostFcfa: menu.estimatedCostFcfa,
    meals: menu.meals.map((r) => ({
      date: r.date,
      slot: r.slot,
      recette: r.recipe.title,
      minutes: r.recipe.minutes,
      coutFcfa: r.recipe.coutFcfa,
    })),
  });

  return {
    propositionId: proposition.id,
    type: proposition.type,
    statut: proposition.status,
    expireA: proposition.expiresAt,
    menuId: menu.id,
    coutEstimeFcfa: menu.estimatedCostFcfa,
    nombreRepas: menu.meals.length,
    message:
      "Menu proposé : la famille voit le détail sur la carte de proposition. Ne recopie pas les repas ; dis en une phrase que le menu est prêt et qu'il faut le confirmer pour obtenir la liste de courses.",
  };
}

export const generateWeekPlan: OutilAgent<typeof schema> = {
  nom: "generateWeekPlan",
  description:
    "Génère un menu pour la semaine en tenant compte du budget, des allergies, du stock et des préférences. La famille confirme avant activation.",
  schema,
  executer,
};
