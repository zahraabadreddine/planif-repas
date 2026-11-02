import { NextResponse } from "next/server";
import { exigerEcriture } from "@/lib/auth/garde";
import { marquerCuisine } from "@/lib/stock/cuisson";
import { gererErreur } from "@/lib/erreurs";

export async function POST(
  _requete: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await exigerEcriture();
    const { id } = await params;
    const resultat = await marquerCuisine(session, id);
    return NextResponse.json(resultat);
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
