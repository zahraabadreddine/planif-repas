import { prisma } from "@/lib/db";

/** Noms des ingrédients du catalogue, pour la recherche « autre allergie ». */
export async function nomsIngredients(): Promise<string[]> {
  const ingredients = await prisma.ingredient.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return ingredients.map((ingredient) => ingredient.name);
}
