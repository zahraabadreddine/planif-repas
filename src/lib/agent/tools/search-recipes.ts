import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { listerCatalogue } from "@/lib/catalogue/recettes";
import type { Filtres } from "@/lib/validation/catalogue";
import type { OutilAgent } from "./types";

const schema = z
  .object({
    texte: z.string().max(60).optional().describe("Mots-clés de recherche"),
    maxMinutes: z.number().int().positive().optional().describe("Temps maximum en minutes"),
    cuisine: z.string().optional().describe("Type de cuisine (ivoirienne, africaine…)"),
    sansCuisson: z.boolean().optional().describe("Recettes sans cuisson uniquement"),
    maxCoutFcfa: z.number().int().positive().optional().describe("Coût maximum en FCFA"),
    ingredients: z.array(z.string()).optional().describe("Ingrédients souhaités dans la recette"),
  })
  .strict();

type Input = z.infer<typeof schema>;

async function executer(session: SessionVerifiee, input: Input, contexte: unknown) {
  const filtres: Filtres = {};
  if (input.texte) filtres.q = input.texte;
  if (input.cuisine) filtres.cuisine = input.cuisine as Filtres["cuisine"];
  if (input.maxMinutes) {
    const seuils = [20, 45, 90] as const;
    filtres.temps = seuils.find((s) => s >= input.maxMinutes!) ?? 90;
  }
  if (input.maxCoutFcfa) {
    const seuils = [2000, 4000, 6000] as const;
    filtres.cout = seuils.find((s) => s >= input.maxCoutFcfa!) ?? 6000;
  }

  let { resultats, masquees } = await chercher(session, filtres, input);
  let message: string | undefined;

  // Des mots-clés qui ne sont dans aucun titre (« fête », « grand repas ») : on garde les autres critères,
  // pour qu'Umi propose des plats sans relancer une recherche à chaque fois
  if (resultats.length === 0 && (input.texte || input.ingredients?.length)) {
    ({ resultats, masquees } = await chercher(
      session,
      { ...filtres, q: undefined },
      {
        ...input,
        ingredients: undefined,
      },
    ));
    message =
      "Aucune recette ne correspond à ces mots-clés : voici les recettes qui respectent les autres critères. Ne relance pas la même recherche.";
  }

  return {
    total: resultats.length,
    masquees,
    ...(message ? { message } : {}),
    recettes: resultats.slice(0, 10).map((r) => ({
      id: r.id,
      titre: r.title,
      cuisine: r.cuisine,
      minutes: r.minutes,
      portions: r.servings,
      coutFcfa: r.cout.totalFcfa,
      tags: r.tags,
    })),
  };
}

async function chercher(session: SessionVerifiee, filtres: Filtres, input: Input) {
  // listerCatalogue filtre les allergies par le code (règle 2)
  const { recettes, masquees } = await listerCatalogue(session, filtres);

  let resultats = recettes;

  if (input.sansCuisson) {
    resultats = resultats.filter((r) => r.tags.includes("sans-cuisson"));
  }
  if (input.ingredients && input.ingredients.length > 0) {
    const voulus = input.ingredients.map((i) => i.toLowerCase());
    resultats = resultats.filter((r) =>
      voulus.some((v) => r.ingredients.some((ing) => ing.toLowerCase().includes(v))),
    );
  }

  return { resultats, masquees };
}

export const searchRecipes: OutilAgent<typeof schema> = {
  nom: "searchRecipes",
  description:
    "Cherche des recettes dans le catalogue. Les recettes incompatibles avec les allergies du foyer sont déjà exclues.",
  schema,
  executer,
};
