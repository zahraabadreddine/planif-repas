import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { derniereConversation } from "@/lib/agent/reprise-chat";

/** GET /api/chat/conversations : la dernière conversation de la personne connectée, pour la reprendre. */
export async function GET() {
  try {
    const session = await exigerSession();
    return NextResponse.json({ conversation: await derniereConversation(session) });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
