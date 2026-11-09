import { NextResponse } from "next/server";
import { exigerEcriture } from "@/lib/auth/garde";
import { lireCorps } from "@/lib/validation/requete";
import { jetSchema } from "@/lib/validation/stock";
import { declarerJet } from "@/lib/stock/jet";
import { gererErreur } from "@/lib/erreurs";

export async function POST(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await exigerEcriture();
    const { id } = await params;
    const { quantity } = await lireCorps(requete, jetSchema);
    const resultat = await declarerJet(session, id, quantity);
    return NextResponse.json(resultat);
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
