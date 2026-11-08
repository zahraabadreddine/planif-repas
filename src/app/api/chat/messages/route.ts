import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";
import { orchestrer } from "@/lib/agent/orchestrateur";
import { prisma } from "@/lib/db";

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

    const propositions = await prisma.agentProposal.findMany({
      where: {
        conversationId: resultat.conversationId,
        status: "pending",
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      conversationId: resultat.conversationId,
      reponse: resultat.reponse,
      tokensIn: resultat.tokensIn,
      tokensOut: resultat.tokensOut,
      propositions: propositions.map((p) => formaterProposition(p)),
    });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

function formaterProposition(p: {
  id: string;
  type: string;
  payload: unknown;
  status: string;
}) {
  const data = p.payload as Record<string, unknown>;

  switch (p.type) {
    case "mealChange":
      return {
        id: p.id,
        type: p.type,
        status: p.status,
        title: (data.nouvelleRecette as string) ?? "Changement de repas",
        label: `Remplacer « ${data.ancienneRecette ?? "?"} »`,
        summary: `${data.minutes ?? "?"} min de préparation`,
      };

    case "weekPlan":
      return {
        id: p.id,
        type: p.type,
        status: p.status,
        title: "Menu de la semaine",
        label: `Semaine du ${data.weekStart ?? "?"}`,
        summary: `${data.estimatedCostFcfa ?? "?"} FCFA estimés`,
      };

    case "emergency": {
      const options = (data.options ?? []) as Array<{ titre?: string }>;
      return {
        id: p.id,
        type: p.type,
        status: p.status,
        title: options[0]?.titre ?? "Mode urgence",
        label: "Urgence",
        summary: `${options.length} option${options.length > 1 ? "s" : ""} rapide${options.length > 1 ? "s" : ""}`,
      };
    }

    case "purchase":
      return {
        id: p.id,
        type: p.type,
        status: p.status,
        title: "Enregistrer les achats",
        label: "Achats",
        summary: `${(data.items as unknown[])?.length ?? 0} article(s)`,
      };

    case "profileUpdate":
      return {
        id: p.id,
        type: p.type,
        status: p.status,
        title: "Mise à jour du profil",
        label: "Profil",
        summary: "Confirme les modifications",
      };

    default:
      return {
        id: p.id,
        type: p.type,
        status: p.status,
        title: "Proposition",
        label: "Action",
        summary: "Confirme pour appliquer",
      };
  }
}
