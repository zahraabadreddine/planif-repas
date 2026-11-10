import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerEcriture, exigerSession } from "@/lib/auth/garde";
import { lireListe } from "@/lib/courses/generation";
import { partageWhatsApp } from "@/lib/courses/whatsapp";
import { ErreurApi, gererErreur } from "@/lib/erreurs";

type Contexte = { params: Promise<{ id: string }> };

async function lireId({ params }: Contexte): Promise<string> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");
  return id;
}

/** GET /api/shopping-lists/:id/share : texte et lien WhatsApp (EF-11). Lecture seule : rien n'est écrit. */
export async function GET(requete: Request, contexte: Contexte) {
  try {
    const session = await exigerSession();
    const partage = partageWhatsApp(await lireListe(session, await lireId(contexte)));
    return NextResponse.json({ text: partage.text, link: partage.link });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

/** POST /api/shopping-lists/:id/share : note que la liste a été partagée, et renvoie le texte et le lien. */
export async function POST(requete: Request, contexte: Contexte) {
  try {
    const session = await exigerEcriture();
    const id = await lireId(contexte);
    // lireListe vérifie que la liste appartient au foyer de la session (règle 4)
    const partage = partageWhatsApp(await lireListe(session, id));
    await prisma.shoppingList.update({ where: { id }, data: { sharedAt: new Date() } });
    return NextResponse.json({ text: partage.text, link: partage.link });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
