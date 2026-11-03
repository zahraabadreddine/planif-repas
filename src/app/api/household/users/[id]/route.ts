import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerProprietaire } from "@/lib/auth/garde";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { changerAcces, retirerPersonne } from "@/lib/foyer/invitations";
import { accesSchema } from "@/lib/validation/invitation";
import { lireCorps } from "@/lib/validation/requete";

type Contexte = { params: Promise<{ id: string }> };

/** Un identifiant mal formé ne peut désigner personne : introuvable. */
async function lireId({ params }: Contexte): Promise<string> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");
  return id;
}

/** PATCH /api/household/users/:id : change le droit d'une personne invitée (EF-03). */
export async function PATCH(requete: Request, contexte: Contexte) {
  try {
    const session = await exigerProprietaire();
    const id = await lireId(contexte);
    const { access } = await lireCorps(requete, accesSchema);
    await changerAcces(session, id, access);
    return NextResponse.json({ id, access });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

/** DELETE /api/household/users/:id : retire une personne invitée du foyer (EF-03). */
export async function DELETE(requete: Request, contexte: Contexte) {
  try {
    const session = await exigerProprietaire();
    await retirerPersonne(session, await lireId(contexte));
    return NextResponse.json({ ok: true });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
