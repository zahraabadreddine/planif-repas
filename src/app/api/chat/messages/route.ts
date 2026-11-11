import { NextRequest } from "next/server";
import { z } from "zod";
import { exigerEcriture } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { orchestrerStream, type EvenementStream } from "@/lib/agent/orchestrateur";
import { prisma } from "@/lib/db";
import { formaterProposition } from "@/lib/agent/cartes-propositions";

const corpsSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().nullable().optional(),
  mode: z.enum(["chat", "emergency", "onboarding"]).optional(),
});

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  function formaterSSE(event: string, data: unknown): Uint8Array {
    return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      let session;
      let corps;
      try {
        session = await exigerEcriture();
        if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");
        corps = corpsSchema.parse(await request.json());
      } catch (err) {
        const message =
          err instanceof ErreurApi ? err.message : "Les informations envoyées ne sont pas valides.";
        controller.enqueue(formaterSSE("error", { message }));
        controller.close();
        return;
      }

      let doneConversationId: string | null = null;

      await orchestrerStream(
        session,
        corps.conversationId ?? null,
        corps.message,
        (evt: EvenementStream) => {
          if (evt.type === "done") doneConversationId = evt.conversationId;
          controller.enqueue(formaterSSE(evt.type, evt));
        },
        corps.mode ?? "chat",
      );

      if (doneConversationId) {
        const propositions = await prisma.agentProposal.findMany({
          where: { conversationId: doneConversationId, status: "pending" },
          orderBy: { createdAt: "asc" },
        });
        if (propositions.length > 0) {
          controller.enqueue(
            formaterSSE("proposals", {
              propositions: propositions.map((p) => formaterProposition(p)),
            }),
          );
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
