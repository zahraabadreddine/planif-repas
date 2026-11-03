import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerSession } from "@/lib/auth/garde";
import { lireListe } from "@/lib/courses/generation";
import { ErreurApi, gererErreur } from "@/lib/erreurs";

type Contexte = { params: Promise<{ id: string }> };

/** GET /api/shopping-lists/:id : liste de courses avec ses coûts (EF-10). Lecture seule permise. */
export async function GET(requete: Request, { params }: Contexte) {
  try {
    const session = await exigerSession();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");
    return NextResponse.json({ list: await lireListe(session, id) });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
