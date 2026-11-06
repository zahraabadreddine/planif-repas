import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { prisma } from "@/lib/db";
import { creerProposition } from "@/lib/agent/proposals";
import type { ContexteOutil, OutilAgent } from "./types";

const articleSchema = z.object({
  ingredientId: z.string().uuid().describe("Identifiant de l'ingrédient"),
  unitId: z.string().uuid().describe("Identifiant de l'unité"),
  quantity: z.number().positive().describe("Quantité achetée"),
  location: z
    .enum(["fridge", "freezer", "pantry"])
    .describe("Où ranger : fridge, freezer ou pantry"),
});

const schema = z
  .object({
    items: z
      .array(articleSchema)
      .min(1)
      .max(50)
      .describe("Articles achetés"),
  })
  .strict();

type Input = z.infer<typeof schema>;

async function executer(
  session: SessionVerifiee,
  input: Input,
  contexte: ContexteOutil,
) {
  const ingredientIds = input.items.map((i) => i.ingredientId);
  const ingredients = await prisma.ingredient.findMany({
    where: { id: { in: ingredientIds } },
    select: { id: true, name: true },
  });

  const noms = new Map(ingredients.map((i) => [i.id, i.name]));

  const articlesResumes = input.items.map((item) => ({
    ...item,
    ingredientNom: noms.get(item.ingredientId) ?? "Inconnu",
  }));

  const proposition = await creerProposition(
    contexte.conversationId,
    "purchase",
    { items: articlesResumes },
  );

  return {
    propositionId: proposition.id,
    type: proposition.type,
    statut: proposition.status,
    expireA: proposition.expiresAt,
    articles: articlesResumes.map((a) => ({
      ingredient: a.ingredientNom,
      quantite: a.quantity,
      emplacement: a.location,
    })),
    message:
      "J'ai préparé l'enregistrement de tes achats. Confirme pour mettre à jour le stock.",
  };
}

export const recordPurchase: OutilAgent<typeof schema> = {
  nom: "recordPurchase",
  description:
    "Enregistre des achats pour mettre à jour le stock du foyer. La famille confirme avant que le stock ne soit modifié.",
  schema,
  executer,
};
