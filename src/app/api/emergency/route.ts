import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerEcriture } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { reorganiserUrgence } from "@/lib/planificateur/modification";
import { lireCorps } from "@/lib/validation/requete";

const emergencySchema = z.strictObject({
  recipeId: z.uuid({ error: "Choisis une recette." }),
});

/**
 * POST /api/emergency : le plat rapide choisi est servi ce soir et le dîner prévu glisse
 * au lendemain (EF-17, §11). La logique est dans reorganiserUrgence.
 */
export async function POST(requete: Request) {
  try {
    const session = await exigerEcriture();
    const { recipeId } = await lireCorps(requete, emergencySchema);
    const resultat = await reorganiserUrgence(session, recipeId);
    return NextResponse.json({
      plan: resultat.menu,
      list: resultat.liste,
      ancienneRecette: resultat.ancienneRecette,
      decale: resultat.decale,
      message: resultat.message,
    });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
