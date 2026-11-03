import { NextResponse } from "next/server";
import { exigerEcriture } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { genererMenu } from "@/lib/planificateur/generation";
import { dateSansHeure, generationSchema } from "@/lib/validation/menu";
import { lireCorps } from "@/lib/validation/requete";

/** POST /api/meal-plans/generate : compose le brouillon du menu de la semaine (EF-06). */
export async function POST(requete: Request) {
  try {
    const session = await exigerEcriture();
    const { weekStart } = await lireCorps(requete, generationSchema);
    const plan = await genererMenu(session, dateSansHeure(weekStart));
    return NextResponse.json({ plan }, { status: 201 });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
