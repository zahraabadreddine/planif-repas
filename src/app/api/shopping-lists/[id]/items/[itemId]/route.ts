import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerEcriture } from "@/lib/auth/garde";
import { cocherArticle } from "@/lib/courses/generation";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { lireCorps } from "@/lib/validation/requete";

type Contexte = { params: Promise<{ id: string; itemId: string }> };

const cocherSchema = z.strictObject({ checked: z.boolean() });

/** PATCH /api/shopping-lists/:id/items/:itemId : coche ou décoche un article (EF-10). */
export async function PATCH(requete: Request, { params }: Contexte) {
  try {
    const session = await exigerEcriture();
    const { id, itemId } = await params;
    if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(itemId).success) {
      throw new ErreurApi("INTROUVABLE");
    }
    const { checked } = await lireCorps(requete, cocherSchema);
    return NextResponse.json({ list: await cocherArticle(session, id, itemId, checked) });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
