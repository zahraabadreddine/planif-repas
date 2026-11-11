import { NextResponse } from "next/server";
import { exigerEcriture } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { enregistrerPlatDuFoyer } from "@/lib/catalogue/plats-foyer";
import { platFoyerSchema } from "@/lib/validation/plat-foyer";
import { lireCorps } from "@/lib/validation/requete";

/**
 * POST /api/recipes/foyer : garde une idée d'Umi comme plat du foyer, avec les quantités
 * validées par la famille. Session, droit d'écrire (lecture seule = 403), zod, puis logique métier.
 */
export async function POST(requete: Request) {
  try {
    const session = await exigerEcriture();
    const plat = await lireCorps(requete, platFoyerSchema);
    return NextResponse.json(
      { plat: await enregistrerPlatDuFoyer(session, plat) },
      { status: 201 },
    );
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
