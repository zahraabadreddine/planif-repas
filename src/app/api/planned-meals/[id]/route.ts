import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerEcriture } from "@/lib/auth/garde";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { remplacerRepas } from "@/lib/planificateur/modification";
import { remplacementSchema } from "@/lib/validation/repas";
import { lireCorps } from "@/lib/validation/requete";

type Contexte = { params: Promise<{ id: string }> };

export async function PATCH(requete: Request, { params }: Contexte) {
  try {
    const session = await exigerEcriture();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");
    const corps = await lireCorps(requete, remplacementSchema);
    const { menu, liste } = await remplacerRepas(session, id, corps.recipeId);
    return NextResponse.json({ plan: menu, list: liste });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
