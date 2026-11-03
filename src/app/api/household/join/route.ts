import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { rejoindreFoyer } from "@/lib/foyer/invitations";
import { rejoindreSchema } from "@/lib/validation/invitation";
import { lireCorps } from "@/lib/validation/requete";

/** POST /api/household/join : rejoint un foyer avec un code d'invitation (EF-03). */
export async function POST(requete: Request) {
  try {
    const session = await exigerSession();
    const { code } = await lireCorps(requete, rejoindreSchema);
    return NextResponse.json(await rejoindreFoyer(session, code));
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
