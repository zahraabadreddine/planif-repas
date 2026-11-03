import { NextResponse } from "next/server";
import { exigerEcriture } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { donnerRetour } from "@/lib/stock/retour-repas";
import { feedbackSchema } from "@/lib/validation/feedback";
import { lireCorps } from "@/lib/validation/requete";

export async function POST(
  requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await exigerEcriture();
    const { id } = await params;
    const feedback = await lireCorps(requete, feedbackSchema);
    const resultat = await donnerRetour(session, id, feedback);
    return NextResponse.json(resultat);
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
