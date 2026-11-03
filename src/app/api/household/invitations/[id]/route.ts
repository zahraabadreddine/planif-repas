import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerProprietaire } from "@/lib/auth/garde";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { annulerInvitation } from "@/lib/foyer/invitations";

type Contexte = { params: Promise<{ id: string }> };

/** DELETE /api/household/invitations/:id : annule un code en attente (EF-03). */
export async function DELETE(requete: Request, { params }: Contexte) {
  try {
    const session = await exigerProprietaire();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");
    await annulerInvitation(session, id);
    return NextResponse.json({ ok: true });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
