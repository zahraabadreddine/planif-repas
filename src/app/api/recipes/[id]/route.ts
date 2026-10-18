import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { lireRecette } from "@/lib/catalogue/recettes";
import { ErreurApi, gererErreur } from "@/lib/erreurs";

/** GET /api/recipes/:id : fiche d'une recette validée, avec coût et compatibilité (EF-20). */
export async function GET(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await exigerSession();
    const { id } = await params;
    const recette = await lireRecette(session, id);
    if (!recette) throw new ErreurApi("INTROUVABLE");
    return NextResponse.json({ recipe: recette });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
