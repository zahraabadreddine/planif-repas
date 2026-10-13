import { notFound } from "next/navigation";
import { getRecipe, recipes } from "@/lib/donnees-simulees";
import { RecipeView } from "./vue-recette";

export function generateStaticParams() {
  return recipes.map((r) => ({ id: r.id }));
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = getRecipe(id);
  if (!recipe) notFound();
  return <RecipeView recipe={recipe} />;
}
