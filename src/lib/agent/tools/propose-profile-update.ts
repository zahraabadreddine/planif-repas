import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { creerProposition } from "@/lib/agent/proposals";
import { BUDGETMIN, BUDGETMAX } from "@/lib/validation/foyer";
import type { ContexteOutil, OutilAgent } from "./types";

const schema = z
  .object({
    name: z.string().min(2).max(50).optional().describe("Nouveau nom du foyer"),
    weeklyBudgetFcfa: z
      .number()
      .int()
      .min(BUDGETMIN)
      .max(BUDGETMAX)
      .optional()
      .describe("Nouveau budget hebdomadaire en FCFA"),
    cuisinesPreferred: z
      .array(z.string())
      .optional()
      .describe("Cuisines préférées du foyer"),
    shoppingDay: z
      .number()
      .int()
      .min(1)
      .max(7)
      .nullable()
      .optional()
      .describe("Jour des courses (1=lundi … 7=dimanche, null=aucun)"),
  })
  .strict()
  .refine(
    (d) =>
      d.name !== undefined ||
      d.weeklyBudgetFcfa !== undefined ||
      d.cuisinesPreferred !== undefined ||
      d.shoppingDay !== undefined,
    { message: "Au moins un champ à modifier." },
  );

type Input = z.infer<typeof schema>;

async function executer(
  session: SessionVerifiee,
  input: Input,
  contexte: ContexteOutil,
) {
  const changements: Record<string, unknown> = {};
  if (input.name !== undefined) changements.name = input.name;
  if (input.weeklyBudgetFcfa !== undefined)
    changements.weeklyBudgetFcfa = input.weeklyBudgetFcfa;
  if (input.cuisinesPreferred !== undefined)
    changements.cuisinesPreferred = input.cuisinesPreferred;
  if (input.shoppingDay !== undefined)
    changements.shoppingDay = input.shoppingDay;

  const proposition = await creerProposition(
    contexte.conversationId,
    "profileUpdate",
    changements,
  );

  return {
    propositionId: proposition.id,
    type: proposition.type,
    statut: proposition.status,
    expireA: proposition.expiresAt,
    changements,
    message:
      "J'ai préparé la modification du profil. Confirme pour l'appliquer.",
  };
}

export const proposeProfileUpdate: OutilAgent<typeof schema> = {
  nom: "proposeProfileUpdate",
  description:
    "Propose une modification du profil du foyer (nom, budget, cuisines, jour des courses). La famille doit confirmer avant application.",
  schema,
  executer,
};
