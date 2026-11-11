import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { controlerIdee } from "@/lib/agent/idees-frigo";
import { PORTIONSMAX } from "@/lib/validation/repas";
import type { ContexteOutil, OutilAgent } from "./types";

const schema = z
  .object({
    titre: z
      .string()
      .min(3)
      .max(80)
      .describe("Nom du plat, par exemple « Attiéké aux œufs brouillés »"),
    ingredientIds: z
      .array(z.uuid())
      .min(1)
      .max(12)
      .describe(
        "Identifiants des aliments utilisés, pris dans alimentsAutorises de findRecipesFromStock",
      ),
    etapes: z
      .array(z.string().min(3).max(200))
      .min(1)
      .max(8)
      .describe("Étapes courtes, sans quantité chiffrée"),
    personnes: z
      .number()
      .int()
      .min(1)
      .max(PORTIONSMAX)
      .describe("Nombre de personnes donné par la famille"),
    minutes: z.number().int().min(1).max(240).optional().describe("Temps total estimé"),
    basesManquantes: z
      .array(z.enum(["sel", "huile"]))
      .optional()
      .describe(
        "Produits de base que la famille a dit ne pas avoir ; sinon sel et huile sont présents",
      ),
  })
  .strict();

type Input = z.infer<typeof schema>;

// L'IA imagine, le code vérifie avant que la famille voie l'idée (règles 1 et 2)
async function executer(session: SessionVerifiee, input: Input, contexte: ContexteOutil) {
  const verification = await controlerIdee(session, input);
  if (!verification.ok) return { refusee: true, erreur: verification.raison };

  contexte.afficher?.({ type: "idee", idee: verification.idee });
  return {
    refusee: false,
    message:
      "L'idée a été vérifiée et la famille la voit sur une carte « Idée d'Umi ». Ne recopie pas les étapes : dis en une phrase ce que tu proposes. Ne demande jamais de la confirmer : une idée ne s'enregistre pas et ne va pas dans le menu, la famille la cuisine si elle veut.",
  };
}

export const proposerIdeeFrigo: OutilAgent<typeof schema> = {
  nom: "proposerIdeeFrigo",
  description:
    "Montre à la famille une idée de plat simple faite uniquement avec les aliments autorisés du stock, quand aucune recette du catalogue n'est faisable. Le code vérifie l'idée ; si elle est refusée, corrige-la selon la raison donnée.",
  schema,
  executer,
};
