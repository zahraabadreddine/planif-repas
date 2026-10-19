import { NextResponse } from "next/server";
import { exigerEcriture, exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { enregistrerFoyer, lireFoyer } from "@/lib/foyer/profil";
import { foyerSchema } from "@/lib/validation/foyer";
import { lireCorps } from "@/lib/validation/requete";

/** GET /api/household : le foyer de la session, ou null s'il n'est pas encore décrit (EF-03). */
export async function GET() {
  try {
    const session = await exigerSession();
    return NextResponse.json({ household: await lireFoyer(session) });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

/** PUT /api/household : crée le foyer de la session (201) ou le modifie (200) (EF-03). */
export async function PUT(requete: Request) {
  try {
    const session = await exigerEcriture();
    const donnees = await lireCorps(requete, foyerSchema);
    const { foyer, cree } = await enregistrerFoyer(session, donnees);
    return NextResponse.json({ household: foyer }, { status: cree ? 201 : 200 });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
