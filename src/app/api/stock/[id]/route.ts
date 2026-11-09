import { NextResponse } from "next/server";
import { exigerEcriture } from "@/lib/auth/garde";
import { lireCorps } from "@/lib/validation/requete";
import { correctionSchema } from "@/lib/validation/stock";
import { corrigerStock } from "@/lib/stock/correction";
import { gererErreur } from "@/lib/erreurs";

export async function PATCH(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await exigerEcriture();
    const { id } = await params;
    const { quantity } = await lireCorps(requete, correctionSchema);
    const resultat = await corrigerStock(session, id, quantity);
    return NextResponse.json(resultat);
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
