import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";
import { orchestrer } from "@/lib/agent/orchestrateur";

const corpsSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().nullable().optional(),
  mode: z.enum(["chat", "emergency", "onboarding"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await exigerSession();
    if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

    const corps = corpsSchema.parse(await request.json());

    const resultat = await orchestrer(
      session,
      corps.conversationId ?? null,
      corps.message,
      corps.mode ?? "chat",
    );

    return NextResponse.json({
      conversationId: resultat.conversationId,
      reponse: resultat.reponse,
      tokensIn: resultat.tokensIn,
      tokensOut: resultat.tokensOut,
    });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
