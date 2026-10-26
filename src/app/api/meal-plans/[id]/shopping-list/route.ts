import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerEcriture } from "@/lib/auth/garde";
import { genererListe } from "@/lib/courses/generation";
import { ErreurApi, gererErreur } from "@/lib/erreurs";

type Contexte = { params: Promise<{ id: string }> };

/** POST /api/meal-plans/:id/shopping-list : (re)génère la liste de courses du menu (EF-09). */
export async function POST(requete: Request, { params }: Contexte) {
  try {
    const session = await exigerEcriture();
    const { id } = await params;
    // Un identifiant mal formé ne peut désigner aucun menu : introuvable.
    if (!z.uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");
    return NextResponse.json({ list: await genererListe(session, id) }, { status: 201 });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
