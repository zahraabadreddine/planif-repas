import { NextRequest } from "next/server";
import { z } from "zod";
import { exigerEcriture } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { orchestrerStream, type EvenementStream } from "@/lib/agent/orchestrateur";
import { prisma } from "@/lib/db";
import { formaterProposition } from "@/lib/agent/cartes-propositions";
import { PHOTOILLISIBLE, PHOTOOCTETSMAX, photoLisible, photoSchema } from "@/lib/agent/photo";

const corpsSchema = z
  .object({
    message: z.string().max(2000),
    conversationId: z.string().uuid().nullable().optional(),
    mode: z.enum(["chat", "emergency", "onboarding"]).optional(),
    // Une photo peut partir seule, sans texte
    photo: photoSchema.optional(),
  })
  .refine((c) => c.message.trim().length > 0 || c.photo !== undefined);

/** Une photo réduite (1,5 Mo, environ 2 Mo une fois en base64), le texte et l'enveloppe JSON. */
const CORPSCHATOCTETSMAX = Math.ceil((PHOTOOCTETSMAX * 4) / 3) + 50_000;

/**
 * Lit le corps en s'arrêtant dès qu'il dépasse la limite : un envoi énorme n'est jamais gardé
 * en mémoire, même quand sa taille n'est pas annoncée.
 */
async function lireCorpsLimite(request: Request, maximum: number): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > maximum) {
    throw new ErreurApi("DONNEESINVALIDES", "Ce message est trop lourd.");
  }
  if (!request.body) throw new ErreurApi("DONNEESINVALIDES");
  const lecteur = request.body.getReader();
  const morceaux: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximum) {
      await lecteur.cancel();
      throw new ErreurApi("DONNEESINVALIDES", "Ce message est trop lourd.");
    }
    morceaux.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(morceaux).toString("utf8"));
  } catch {
    throw new ErreurApi("DONNEESINVALIDES");
  }
}

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
        corps = corpsSchema.parse(await lireCorpsLimite(request, CORPSCHATOCTETSMAX));
        if (corps.photo && !photoLisible(corps.photo)) {
          throw new ErreurApi("DONNEESINVALIDES", PHOTOILLISIBLE);
        }
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
        corps.photo,
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
