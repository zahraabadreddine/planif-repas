import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ouAcheter } from "@/lib/magasins/recommandation";
import { prisma } from "@/lib/db";
import type { OutilAgent } from "./types";

const schema = z
  .object({
    listeId: z.string().optional().describe("Identifiant de la liste de courses"),
    ingredients: z.array(z.string()).optional().describe("Noms d'ingrédients si pas de liste"),
    typeLieu: z
      .enum(["market", "supermarket", "shop"])
      .optional()
      .describe("Filtrer par type de lieu"),
  })
  .strict()
  .refine((d) => d.listeId || (d.ingredients && d.ingredients.length > 0), {
    message: "Fournir listeId ou ingredients",
  });

type Input = z.infer<typeof schema>;

async function executer(session: SessionVerifiee, input: Input, contexte: unknown) {
  if (input.listeId) {
    const resultat = await ouAcheter(session, input.listeId);
    const lieux = input.typeLieu
      ? resultat.lieux.filter((l) => l.placeType === input.typeLieu)
      : resultat.lieux;
    return {
      lieux: lieux.map((l) => ({
        type: l.placeType,
        label: l.label,
        articles: l.articles.map((a) => ({
          ingredient: a.ingredient,
          quantite: a.quantity,
          unite: a.unit,
          prixEstimeFcfa: a.estimatedPriceFcfa,
        })),
        magasins: l.magasins.map((m) => ({
          nom: m.name,
          distanceKm: m.distanceKm,
        })),
      })),
    };
  }

  // Sans liste : chercher les ingrédients par nom et indiquer les lieux connus
  const noms = input.ingredients!;
  const ingredients = await prisma.ingredient.findMany({
    where: { name: { in: noms, mode: "insensitive" } },
    include: {
      prices: {
        where: { city: "Abidjan" },
        select: { placeType: true, priceFcfa: true, unit: { select: { label: true } } },
      },
    },
  });

  const resultats = ingredients.map((ing) => {
    const prix = input.typeLieu
      ? ing.prices.filter((p) => p.placeType === input.typeLieu)
      : ing.prices;
    return {
      ingredient: ing.name,
      lieuxConnus: prix.map((p) => ({
        type: p.placeType,
        prixFcfa: p.priceFcfa,
        unite: p.unit.label,
      })),
    };
  });

  return { ingredients: resultats };
}

export const findWhereToBuy: OutilAgent<typeof schema> = {
  nom: "findWhereToBuy",
  description:
    "Indique où acheter les ingrédients : par liste de courses (avec magasins proches), ou par noms d'ingrédients (avec prix connus).",
  schema,
  executer,
};
