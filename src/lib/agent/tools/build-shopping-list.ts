import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { genererListe } from "@/lib/courses/generation";
import type { ContexteOutil, OutilAgent } from "./types";

const schema = z
  .object({
    mealPlanId: z.string().uuid().describe("Identifiant du menu actif"),
  })
  .strict();

type Input = z.infer<typeof schema>;

async function executer(
  session: SessionVerifiee,
  input: Input,
  _contexte: ContexteOutil,
) {
  const liste = await genererListe(session, input.mealPlanId);

  return {
    listeId: liste.id,
    menuId: liste.mealPlanId,
    totalEstimeFcfa: liste.estimatedTotalFcfa,
    nombreArticles: liste.items.length,
    articles: liste.items.map((a) => ({
      ingredient: a.ingredient,
      quantite: a.quantity,
      unite: a.unit,
      prixEstimeFcfa: a.estimatedPriceFcfa,
      lieu: a.placeType,
    })),
    message:
      "La liste de courses a été générée. Tu peux la consulter et la partager sur WhatsApp.",
  };
}

export const buildShoppingList: OutilAgent<typeof schema> = {
  nom: "buildShoppingList",
  description:
    "Génère la liste de courses d'un menu actif, avec les quantités en unités du marché et les coûts estimés en FCFA.",
  schema,
  executer,
};
