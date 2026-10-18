import { notFound, redirect } from "next/navigation";
import { exigerSession } from "@/lib/auth/garde";
import { lireRecette } from "@/lib/catalogue/recettes";
import { ErreurApi } from "@/lib/erreurs";
import { RecipeView } from "./vue-recette";

/** Fiche d'une recette validée du catalogue (EF-20). */
export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await exigerSession().catch((erreur: unknown) => {
    if (erreur instanceof ErreurApi) return null;
    throw erreur;
  });
  if (!session) redirect("/connexion");

  const { id } = await params;
  const recette = await lireRecette(session, id);
  if (!recette) notFound();
  return <RecipeView recipe={recette} />;
}
