import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerSession } from "@/lib/auth/garde";
import { lireListe } from "@/lib/courses/generation";
import { partageWhatsApp } from "@/lib/courses/whatsapp";
import { ErreurApi, gererErreur } from "@/lib/erreurs";

type Contexte = { params: Promise<{ id: string }> };

/** GET /api/shopping-lists/:id/share : texte et lien WhatsApp (EF-11). */
export async function GET(requete: Request, { params }: Contexte) {
  try {
    const session = await exigerSession();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");
    const liste = await lireListe(session, id);
    const partage = partageWhatsApp(liste);

    await prisma.shoppingList.update({
      where: { id },
      data: { sharedAt: new Date() },
    });

    return NextResponse.json({ text: partage.text, link: partage.link });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
