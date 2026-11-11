import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { CATEGORIESPLAT, controlerPlat } from "@/lib/agent/idees-plats";
import { PORTIONSMAX } from "@/lib/validation/repas";
import type { ContexteOutil, OutilAgent } from "./types";

const schema = z
  .object({
    titre: z.string().min(3).max(80).describe("Nom du plat, par exemple « Fattouche »"),
    categorie: z.enum(CATEGORIESPLAT).optional().describe("Place du plat dans un repas de fête"),
    ingredients: z
      .array(z.string().min(2).max(60))
      .min(1)
      .max(15)
      .describe("Noms exacts pris dans listerIngredientsPermis, sans quantité"),
    etapes: z
      .array(z.string().min(3).max(200))
      .max(6)
      .optional()
      .describe("Étapes courtes, sans quantité chiffrée"),
    personnes: z.number().int().min(1).max(PORTIONSMAX).describe("Nombre d'invités"),
  })
  .strict();

type Input = z.infer<typeof schema>;

// L'IA imagine un plat hors catalogue ; le code le vérifie avant que la famille le voie (règles 1 et 2)
async function executer(session: SessionVerifiee, input: Input, contexte: ContexteOutil) {
  const verification = await controlerPlat(session, input);
  if (!verification.ok) return { refusee: true, erreur: verification.raison };

  contexte.afficher?.({ type: "idee", idee: verification.idee });
  return {
    refusee: false,
    aAcheter: verification.idee.aAcheter?.length ?? 0,
    message:
      "Le plat a été vérifié et la famille le voit sur une carte « Idée d'Umi ». Ne recopie pas la carte. Ne donne ni quantité ni prix, et ne propose pas de le confirmer : une idée ne va pas dans le menu.",
  };
}

export const proposerIdeePlat: OutilAgent<typeof schema> = {
  nom: "proposerIdeePlat",
  description:
    "Quand le catalogue n'a pas le plat voulu (fête, cuisine d'ailleurs) : montre un plat imaginé avec des ingrédients de listerIngredientsPermis. Un appel par plat. Le code vérifie le plat ; s'il est refusé, corrige-le selon la raison donnée.",
  schema,
  executer,
};
