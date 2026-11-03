import { NextResponse } from "next/server";
import { exigerProprietaire, exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { creerInvitation, lirePartage } from "@/lib/foyer/invitations";
import { accesSchema } from "@/lib/validation/invitation";
import { lireCorps } from "@/lib/validation/requete";

/** GET /api/household/invitations : personnes du foyer, et codes en attente pour le propriétaire (EF-03). */
export async function GET() {
  try {
    const session = await exigerSession();
    return NextResponse.json(await lirePartage(session));
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

/** POST /api/household/invitations : crée un code d'invitation, renvoyé en clair une seule fois (EF-03). */
export async function POST(requete: Request) {
  try {
    const session = await exigerProprietaire();
    const { access } = await lireCorps(requete, accesSchema);
    return NextResponse.json(
      { invitation: await creerInvitation(session, access) },
      { status: 201 },
    );
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
