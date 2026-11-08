import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { prisma } from "@/lib/db";
import { ErreurApi } from "@/lib/erreurs";
import type { ContexteOutil, OutilAgent } from "./types";

const schema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(100)
      .describe("Clé de la préférence (ex : « aime-poisson », « eviter-piment »)"),
    value: z
      .string()
      .min(1)
      .max(500)
      .describe("Valeur de la préférence"),
    explanation: z
      .string()
      .min(1)
      .max(500)
      .describe("Explication lisible de la préférence pour la famille"),
  })
  .strict();

type Input = z.infer<typeof schema>;

async function executer(
  session: SessionVerifiee,
  input: Input,
  contexte: ContexteOutil,
) {
  if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

  const existante = await prisma.learnedPreference.findFirst({
    where: { householdId: session.householdId, key: input.key },
  });

  let preference;
  if (existante) {
    preference = await prisma.learnedPreference.update({
      where: { id: existante.id },
      data: {
        value: input.value,
        explanation: input.explanation,
        confidence: Math.min(existante.confidence + 0.2, 1.0),
        active: true,
        source: "agent",
      },
    });
  } else {
    preference = await prisma.learnedPreference.create({
      data: {
        householdId: session.householdId,
        key: input.key,
        value: input.value,
        explanation: input.explanation,
        confidence: 0.6,
        source: "agent",
        active: true,
      },
    });
  }

  return {
    preferenceId: preference.id,
    cle: preference.key,
    valeur: preference.value,
    confiance: preference.confidence,
    nouvelle: !existante,
    message: existante
      ? `J'ai mis à jour la préférence « ${input.key} ». Je m'en souviendrai.`
      : `J'ai noté une nouvelle préférence : ${input.explanation}`,
  };
}

export const rememberPreference: OutilAgent<typeof schema> = {
  nom: "rememberPreference",
  description:
    "Enregistre ou met à jour une préférence apprise du foyer. Utilisée quand une tendance se confirme (plat aimé ou évité plusieurs fois).",
  schema,
  executer,
};
