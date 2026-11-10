import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { exigerEcriture } from "@/lib/auth/garde";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { accepterProposition } from "@/lib/agent/proposals";

// Corps facultatif : le plat d'urgence choisi parmi les options de la proposition.
const choixSchema = z.strictObject({ recetteId: z.string().min(1).max(64).optional() });

/** Lit le choix de la famille ; un corps vide garde la première option. */
async function lireChoix(requete: NextRequest) {
  const texte = await requete.text();
  if (texte.trim() === "") return {};
  let corps: unknown;
  try {
    corps = JSON.parse(texte);
  } catch {
    throw new ErreurApi("DONNEESINVALIDES");
  }
  const resultat = choixSchema.safeParse(corps);
  if (!resultat.success) throw new ErreurApi("DONNEESINVALIDES");
  return resultat.data;
}

/** POST /api/chat/proposals/:id/accept : la famille confirme, le code revérifie puis applique (règle 1). */
export async function POST(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await exigerEcriture();
    const { id } = await params;
    // Un identifiant mal formé ne peut désigner aucune proposition : introuvable.
    if (!z.uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");
    const choix = await lireChoix(requete);
    return NextResponse.json(await accepterProposition(session, id, choix));
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
