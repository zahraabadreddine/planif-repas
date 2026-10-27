import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerEcriture } from "@/lib/auth/garde";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { activerMenu } from "@/lib/planificateur/generation";

type Contexte = { params: Promise<{ id: string }> };

/** POST /api/meal-plans/:id/activate : la famille valide le menu, la liste de courses est calculée. */
export async function POST(requete: Request, { params }: Contexte) {
  try {
    const session = await exigerEcriture();
    const { id } = await params;
    // Un identifiant mal formé ne peut désigner aucun menu : introuvable.
    if (!z.uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");
    const { menu, liste } = await activerMenu(session, id);
    return NextResponse.json({ plan: menu, list: liste });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
