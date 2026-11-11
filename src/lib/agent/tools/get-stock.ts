import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { lireStock } from "@/lib/stock/lecture";
import type { OutilAgent } from "./types";

const schema = z.object({}).strict();

type Input = z.infer<typeof schema>;

async function executer(session: SessionVerifiee, input: Input, contexte: unknown) {
  const articles = await lireStock(session);
  return {
    total: articles.length,
    // Court : chaque jeton compte, le résultat est renvoyé à l'IA à chaque tour
    articles: articles.map((a) => ({
      ingredient: a.ingredientName,
      quantite: `${a.quantity} ${a.unitLabel}`,
      peremption: a.expiresAt ? a.expiresAt.slice(0, 10) : null,
      ...(a.status === "useSoon" ? { aUtiliserVite: true } : {}),
    })),
  };
}

export const getStock: OutilAgent<typeof schema> = {
  nom: "getStock",
  description:
    "Renvoie le stock actuel du foyer : ingrédients, quantités, unités, emplacements et dates de péremption.",
  schema,
  executer,
};
