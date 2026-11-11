import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerEcriture } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { reorganiserUrgence } from "@/lib/planificateur/modification";
import { creneauDuMoment } from "@/lib/planificateur/moment";
import { lireCorps } from "@/lib/validation/requete";

// strictObject : le foyer vient de la session, jamais de la requête.
const emergencySchema = z.strictObject({
  recipeId: z.uuid(),
  // Le repas montré à l'écran : un choix fait à 11 h 59 reste un petit déjeuner à 12 h 01
  creneau: z.enum(["breakfast", "lunch", "dinner"]).optional(),
});

/**
 * POST /api/emergency : le plat rapide choisi remplace le repas du moment (petit déjeuner,
 * déjeuner ou dîner, selon l'heure) et le repas prévu glisse (EF-17, §11). Logique : reorganiserUrgence.
 */
export async function POST(requete: Request) {
  try {
    const session = await exigerEcriture();
    const { recipeId, creneau } = await lireCorps(requete, emergencySchema);
    const resultat = await reorganiserUrgence(session, recipeId, creneau ?? creneauDuMoment());
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
