import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { suggererRecettes } from "@/lib/stock/vider-frigo";
import { lireAlimentsAutorises } from "@/lib/agent/idees-frigo";
import { PORTIONSMAX } from "@/lib/validation/repas";
import type { OutilAgent } from "./types";

const schema = z
  .object({
    personnes: z
      .number()
      .int()
      .min(1)
      .max(PORTIONSMAX)
      .optional()
      .describe("Nombre de personnes à servir (défaut : tout le foyer)"),
    maxMinutes: z.number().int().positive().optional().describe("Temps maximum en minutes"),
  })
  .strict();

type Input = z.infer<typeof schema>;

// Même logique que la page « Vider le frigo » : rien à acheter, quantités et allergies vérifiées par le code
async function executer(session: SessionVerifiee, input: Input) {
  const recettes = (await suggererRecettes(session, input.personnes)).filter(
    (r) => !input.maxMinutes || r.prepMinutes + r.cookMinutes <= input.maxMinutes,
  );

  if (recettes.length === 0) {
    // Les aliments interdits à un membre sont retirés par le code avant que l'IA les voie (règle 2)
    const aliments = await lireAlimentsAutorises(session);
    return {
      total: 0,
      recettes: [],
      alimentsAutorises: aliments,
      message:
        aliments.length === 0
          ? "Aucune recette faisable et aucun aliment autorisé dans le stock : dis-le honnêtement."
          : "Aucune recette du catalogue n'est faisable avec le stock seul. Ne propose pas d'achat : appelle proposerIdeeFrigo avec seulement ces aliments autorisés, sans changer leurs quantités.",
    };
  }

  return {
    total: recettes.length,
    recettes: recettes.slice(0, 5).map((r) => ({
      id: r.id,
      titre: r.title,
      minutes: r.prepMinutes + r.cookMinutes,
      utiliseUnAlimentAUtiliserVite: r.utiliseUseSoon,
    })),
    message: "Ces recettes se font entièrement avec le stock, sans rien acheter.",
  };
}

export const findRecipesFromStock: OutilAgent<typeof schema> = {
  nom: "findRecipesFromStock",
  description:
    "Recettes du catalogue faisables entièrement avec le stock du foyer, sans rien acheter, pour le nombre de personnes donné. Les allergies et les quantités sont vérifiées par le code.",
  schema,
  executer,
};
