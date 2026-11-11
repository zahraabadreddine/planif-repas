import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { suggestionsUrgence } from "@/lib/urgence/suggestion";
import { creerProposition } from "@/lib/agent/proposals";
import { creneauDuMoment } from "@/lib/planificateur/moment";
import type { ContexteOutil, OutilAgent } from "./types";

const schema = z
  .object({
    maxMinutes: z.number().int().positive().describe("Temps maximum disponible en minutes"),
    nbPersonnes: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Nombre de personnes à servir (défaut : membres du foyer)"),
  })
  .strict();

type Input = z.infer<typeof schema>;

async function executer(session: SessionVerifiee, input: Input, contexte: ContexteOutil) {
  // Le repas du moment, gardé dans la proposition : il ne change pas si la famille confirme plus tard
  const creneau = creneauDuMoment();
  const options = await suggestionsUrgence(session, input.maxMinutes, input.nbPersonnes, creneau);

  if (options.length === 0) {
    return {
      options: [],
      message: `Aucune recette faisable en ${input.maxMinutes} minutes avec ton stock actuel. Tu peux commander ou acheter un plat rapide.`,
    };
  }

  const proposition = await creerProposition(contexte.conversationId, "emergency", {
    maxMinutes: input.maxMinutes,
    creneau,
    options: options.map((o) => ({
      recetteId: o.id,
      titre: o.title,
      totalMinutes: o.totalMinutes,
      utiliseUseSoon: o.utiliseUseSoon,
    })),
  });

  return {
    propositionId: proposition.id,
    type: proposition.type,
    statut: proposition.status,
    expireA: proposition.expiresAt,
    options: options.map((o) => ({
      recetteId: o.id,
      titre: o.title,
      cuisine: o.cuisine,
      totalMinutes: o.totalMinutes,
      utiliseUseSoon: o.utiliseUseSoon,
      difficulte: o.difficulty,
    })),
    message: `Voici ${options.length} option${options.length > 1 ? "s" : ""} rapide${options.length > 1 ? "s" : ""} avec ton stock. Choisis celle qui te convient !`,
  };
}

export const planEmergency: OutilAgent<typeof schema> = {
  nom: "planEmergency",
  description:
    "Mode urgence : propose 1 à 3 recettes rapides faisables avec le stock actuel, filtrées par temps disponible. Les allergies sont déjà exclues.",
  schema,
  executer,
};
