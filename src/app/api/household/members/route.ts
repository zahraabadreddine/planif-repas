import { NextResponse } from "next/server";
import { exigerSession, exigerEcriture } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { ajouterMembre, listerMembres } from "@/lib/foyer/membres";
import { membreSchema } from "@/lib/validation/membre";
import { lireCorps } from "@/lib/validation/requete";

/** GET /api/household/members : liste les membres du foyer de la session (EF-03). */
export async function GET() {
  try {
    const session = await exigerSession();
    const membres = await listerMembres(session);
    return NextResponse.json({ members: membres });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

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
