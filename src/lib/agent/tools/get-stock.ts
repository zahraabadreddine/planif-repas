import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { lireStock } from "@/lib/stock/lecture";
import type { OutilAgent } from "./types";

const schema = z.object({}).strict();

type Input = z.infer<typeof schema>;

async function executer(session: SessionVerifiee, _input: Input, _contexte: unknown) {
  const articles = await lireStock(session);
  return {
    total: articles.length,
    articles: articles.map((a) => ({
      ingredient: a.ingredientName,
      categorie: a.category,
      quantite: a.quantity,
      unite: a.unitLabel,
      emplacement: a.location,
      peremption: a.expiresAt ? a.expiresAt.slice(0, 10) : null,
      statut: a.status,
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
