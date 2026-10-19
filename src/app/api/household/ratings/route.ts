import { NextResponse } from "next/server";
import { exigerEcriture } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { noterPlat } from "@/lib/foyer/notes";
import { noteSchema } from "@/lib/validation/note";
import { lireCorps } from "@/lib/validation/requete";

/**
 * POST /api/household/ratings : note un plat pour le foyer de la session (EF-04).
 * rating : 3 (j'aime), 2 (bof), 1 (je n'aime pas) ou null pour retirer la note.
 */
export async function POST(requete: Request) {
  try {
    const session = await exigerEcriture();
    const { recipeId, rating } = await lireCorps(requete, noteSchema);
    await noterPlat(session, recipeId, rating);
    return NextResponse.json({ recipeId, rating });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
