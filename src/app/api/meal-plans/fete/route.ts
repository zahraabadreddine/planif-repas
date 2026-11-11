import { NextResponse } from "next/server";
import { exigerEcriture } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { appliquerFete } from "@/lib/planificateur/fete";
import { feteSchema } from "@/lib/validation/fete";
import { lireCorps } from "@/lib/validation/requete";

/**
 * POST /api/meal-plans/fete : la famille met un menu de fête dans son menu de la semaine.
 * Session, droit d'écrire (lecture seule = 403), zod, puis le code revérifie tout (règle 1).
 */
export async function POST(requete: Request) {
  try {
    const session = await exigerEcriture();
    const demande = await lireCorps(requete, feteSchema);
    return NextResponse.json(await appliquerFete(session, demande));
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
