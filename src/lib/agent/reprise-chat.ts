import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { listerMembres } from "@/lib/foyer/membres";
import { construireTableSurnoms, restaurerSurnoms } from "./context";
import { formaterProposition } from "./cartes-propositions";

// Reprendre le chat là où la famille l'a laissé : sa dernière conversation, ses cartes en attente.

/** Messages rechargés au plus : au-delà, la conversation reste en base mais n'est pas réaffichée. */
export const MESSAGESREPRISMAX = 60;

export type ConversationReprise = {
  id: string;
  messages: { id: string; role: "user" | "assistant"; content: string }[];
  propositions: ReturnType<typeof formaterProposition>[];
};

/** Dernière conversation de chat de la personne connectée, dans son foyer, ou null. */
export async function derniereConversation(
  session: SessionVerifiee,
): Promise<ConversationReprise | null> {
  const householdId = session.householdId;
  if (!householdId) throw new ErreurApi("FOYERMANQUANT");

  const dernier = await prisma.message.findFirst({
    where: { conversation: { householdId, userId: session.userId, mode: "chat" } },
    orderBy: { createdAt: "desc" },
    select: { conversationId: true },
  });
  if (!dernier) return null;

  const [messages, propositions, membres] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: dernier.conversationId, role: { in: ["user", "assistant"] } },
      orderBy: { createdAt: "desc" },
      take: MESSAGESREPRISMAX,
      select: { id: true, role: true, content: true },
    }),
    prisma.agentProposal.findMany({
      where: {
        conversationId: dernier.conversationId,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "asc" },
    }),
    listerMembres(session),
  ]);

  // Les messages sont enregistrés anonymisés (« Enfant 1 ») : la famille revoit ses surnoms
  const table = construireTableSurnoms(membres);
  return {
    id: dernier.conversationId,
    messages: messages.reverse().map((m) => ({
      id: m.id,
      role: m.role === "user" ? "user" : "assistant",
      content: restaurerSurnoms(String(m.content), table),
    })),
    propositions: propositions.map(formaterProposition),
  };
}
