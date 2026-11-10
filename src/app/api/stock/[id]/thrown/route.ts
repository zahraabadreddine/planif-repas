import { z } from "zod";
import { NextResponse } from "next/server";
import { exigerEcriture } from "@/lib/auth/garde";
import { lireCorps } from "@/lib/validation/requete";
import { jetSchema } from "@/lib/validation/stock";
import { declarerJet } from "@/lib/stock/jet";
import { ErreurApi, gererErreur } from "@/lib/erreurs";

export async function POST(requete: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await exigerEcriture();
    const { id } = await params;
    // Un identifiant mal formé ne peut désigner aucun article : introuvable.
    if (!z.uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");
    const { quantity } = await lireCorps(requete, jetSchema);
    const resultat = await declarerJet(session, id, quantity);
    return NextResponse.json(resultat);
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
