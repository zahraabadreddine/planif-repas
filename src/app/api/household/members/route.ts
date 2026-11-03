import { NextResponse } from "next/server";
import { exigerEcriture } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { ajouterMembre } from "@/lib/foyer/membres";
import { membreSchema } from "@/lib/validation/membre";
import { lireCorps } from "@/lib/validation/requete";

/** POST /api/household/members : ajoute un membre au foyer de la session (EF-03). */
export async function POST(requete: Request) {
  try {
    const session = await exigerEcriture();
    const membre = await lireCorps(requete, membreSchema);
    return NextResponse.json({ member: await ajouterMembre(session, membre) }, { status: 201 });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
