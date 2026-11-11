import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { lireIngredientsPermis } from "@/lib/agent/idees-plats";
import type { OutilAgent } from "./types";

const schema = z.object({}).strict();

// Les ingrédients interdits à un membre sont retirés par le code avant que l'IA les voie (règle 2)
async function executer(session: SessionVerifiee) {
  return {
    ingredients: await lireIngredientsPermis(session),
    message:
      "Seuls ces ingrédients peuvent servir à imaginer un plat. Ne donne ni quantité ni prix : le code ne peut pas les vérifier.",
  };
}

export const listerIngredientsPermis: OutilAgent<typeof schema> = {
  nom: "listerIngredientsPermis",
  description:
    "Ingrédients du catalogue que tout le foyer peut manger (allergies et régimes retirés par le code). À appeler avant proposerIdeePlat.",
  schema,
  executer,
};
