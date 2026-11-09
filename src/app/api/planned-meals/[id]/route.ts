import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerEcriture } from "@/lib/auth/garde";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { changerPortions, deplacerRepas, remplacerRepas } from "@/lib/planificateur/modification";
import { modificationRepasSchema } from "@/lib/validation/repas";
import { lireCorps } from "@/lib/validation/requete";

type Contexte = { params: Promise<{ id: string }> };

export async function PATCH(requete: Request, { params }: Contexte) {
  try {
    const session = await exigerEcriture();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");
    const corps = await lireCorps(requete, modificationRepasSchema);

    let resultat;

    if (corps.recipeId) {
      resultat = await remplacerRepas(session, id, corps.recipeId);
    }

    if (corps.date || corps.slot) {
      resultat = await deplacerRepas(session, id, corps.date, corps.slot);
    }

    if (corps.servings !== undefined) {
      resultat = await changerPortions(session, id, corps.servings);
    }

    if (!resultat) throw new ErreurApi("DONNEESINVALIDES");

    return NextResponse.json({ plan: resultat.menu, list: resultat.liste });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
