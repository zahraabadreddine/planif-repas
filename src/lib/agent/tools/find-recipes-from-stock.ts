import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { lireStock } from "@/lib/stock/lecture";
import { listerCatalogue } from "@/lib/catalogue/recettes";
import type { OutilAgent } from "./types";

const schema = z
  .object({
    maxMinutes: z.number().int().positive().optional().describe("Temps maximum en minutes"),
  })
  .strict();

type Input = z.infer<typeof schema>;

async function executer(session: SessionVerifiee, input: Input) {
  const [stock, { recettes }] = await Promise.all([
    lireStock(session),
    listerCatalogue(session, {}),
  ]);

  const ingredientsEnStock = new Set(stock.map((a) => a.ingredientName.toLowerCase()));

  const avecScore = recettes
    .filter((r) => !input.maxMinutes || r.minutes <= input.maxMinutes)
    .map((r) => {
      const enStock = r.ingredients.filter((i) => ingredientsEnStock.has(i.toLowerCase())).length;
      return { recette: r, enStock, total: r.ingredients.length };
    })
    .filter((r) => r.enStock > 0)
    .sort((a, b) => b.enStock / b.total - a.enStock / a.total);

  return {
    total: avecScore.length,
    recettes: avecScore.slice(0, 10).map((r) => ({
      id: r.recette.id,
      titre: r.recette.title,
      cuisine: r.recette.cuisine,
      minutes: r.recette.minutes,
      coutFcfa: r.recette.cout.totalFcfa,
      ingredientsEnStock: r.enStock,
      ingredientsTotal: r.total,
    })),
  };
}

export const findRecipesFromStock: OutilAgent<typeof schema> = {
  nom: "findRecipesFromStock",
  description:
    "Trouve les recettes réalisables avec le stock actuel du foyer, triées par couverture d'ingrédients. Les allergies sont déjà exclues.",
  schema,
  executer,
};
