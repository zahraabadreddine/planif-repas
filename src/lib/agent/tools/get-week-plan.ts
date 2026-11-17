import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { lireMenuCourant, lireMenuDeLaSemaine } from "@/lib/planificateur/generation";
import { dateValide, libelleSemaine, lundiDe } from "@/lib/planificateur/semaines";
import type { OutilAgent } from "./types";

const schema = z
  .object({
    weekStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(dateValide, "Date invalide.")
      .optional()
      .describe(
        "Un jour de la semaine voulue, AAAA-MM-JJ (facultatif : par défaut la semaine en cours)",
      ),
  })
  .strict();

type Input = z.infer<typeof schema>;

// Le foyer vient de la session (règle 4) : la date ne choisit que la semaine, jamais le foyer
async function executer(session: SessionVerifiee, input: Input) {
  if (input.weekStart) {
    const lundi = lundiDe(input.weekStart);
    const menu = await lireMenuDeLaSemaine(session, lundi);
    if (!menu) {
      // « 23 → 29 nov. » finit déjà par un point, « 1er → 7 juin » non
      const semaine = libelleSemaine(lundi).replace(/\.?$/, ".");
      return { menu: null, message: `Aucun menu pour la semaine du ${semaine}` };
    }
    return { menu };
  }
  const menu = await lireMenuCourant(session);
  if (!menu) return { menu: null, message: "Aucun menu en cours." };
  return { menu };
}

export const getWeekPlan: OutilAgent<typeof schema> = {
  nom: "getWeekPlan",
  description:
    "Renvoie le menu d'une semaine : la semaine en cours par défaut, ou celle du jour donné dans weekStart (par exemple la semaine prochaine). Chaque repas indique la recette, le temps, le coût.",
  schema,
  executer,
};
