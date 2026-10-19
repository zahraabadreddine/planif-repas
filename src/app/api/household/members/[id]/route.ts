import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerEcriture } from "@/lib/auth/garde";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { modifierMembre, retirerMembre } from "@/lib/foyer/membres";
import { membreSchema } from "@/lib/validation/membre";
import { lireCorps } from "@/lib/validation/requete";

type Contexte = { params: Promise<{ id: string }> };

/** Un identifiant mal formé ne peut désigner aucun membre : introuvable. */
async function lireId({ params }: Contexte): Promise<string> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");
  return id;
}

/** PUT /api/household/members/:id : modifie un membre du foyer de la session (EF-03). */
export async function PUT(requete: Request, contexte: Contexte) {
  try {
    const session = await exigerEcriture();
    const id = await lireId(contexte);
    const membre = await lireCorps(requete, membreSchema);
    return NextResponse.json({ member: await modifierMembre(session, id, membre) });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

/** DELETE /api/household/members/:id : retire un membre et ses restrictions (EF-03). */
export async function DELETE(requete: Request, contexte: Contexte) {
  try {
    const session = await exigerEcriture();
    await retirerMembre(session, await lireId(contexte));
    return NextResponse.json({ ok: true });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
