import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { lireMenuCourant } from "@/lib/planificateur/generation";
import type { OutilAgent } from "./types";

const schema = z
  .object({
    weekStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Date ISO du lundi (facultatif, par défaut le menu actif)"),
  })
  .strict();

async function executer(session: SessionVerifiee) {
  const menu = await lireMenuCourant(session);
  if (!menu) return { menu: null, message: "Aucun menu en cours." };
  return { menu };
}

export const getWeekPlan: OutilAgent<typeof schema> = {
  nom: "getWeekPlan",
  description:
    "Renvoie le menu de la semaine en cours (ou le dernier brouillon). Chaque repas indique la recette, le temps, le coût.",
  schema,
  executer,
};
