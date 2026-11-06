import type Anthropic from "@anthropic-ai/sdk";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { prisma } from "@/lib/db";
import { ErreurApi } from "@/lib/erreurs";
import {
  creerClient,
  estSimule,
  prochaineReponseSimulee,
  MAX_TOURS_OUTILS,
  MODELE_CONVERSATION,
} from "./client";
import { PROMPT_SYSTEME } from "./prompt";
import {
  construireContexte,
  formaterContextePourPrompt,
  remplacerSurnoms,
  restaurerSurnoms,
  type TableSurnoms,
} from "./context";
import { OUTILS, outilsAnthropicSchema } from "./tools";

export type ResultatOrchestration = {
  conversationId: string;
  reponse: string;
  tokensIn: number;
  tokensOut: number;
};

const MAX_MESSAGES_HISTORIQUE = 20;

export async function orchestrer(
  session: SessionVerifiee,
  conversationId: string | null,
  messageUtilisateur: string,
  mode: "chat" | "emergency" | "onboarding" = "chat",
): Promise<ResultatOrchestration> {
  if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

  const { contexte, table } = await construireContexte(session);
  const messageAnonyme = remplacerSurnoms(messageUtilisateur, table);

  const conv = conversationId
    ? await chargerConversation(session, conversationId)
    : await creerConversation(session, mode);

  await enregistrerMessage(conv.id, "user", messageAnonyme);

  const historique = await chargerHistorique(conv.id);
  const messagesApi = construireMessagesApi(historique);

  const systeme = [
    PROMPT_SYSTEME,
    "",
    "Contexte actuel du foyer :",
    formaterContextePourPrompt(contexte),
  ].join("\n");

  let reponseTexte: string;
  let tokensIn = 0;
  let tokensOut = 0;

  if (estSimule()) {
    const r = await boucleSimulee(session, conv.id, messagesApi, table);
    reponseTexte = r.texte;
  } else {
    const r = await boucleReelle(session, conv.id, systeme, messagesApi, table);
    reponseTexte = r.texte;
    tokensIn = r.tokensIn;
    tokensOut = r.tokensOut;
  }

  const reponseFinale = restaurerSurnoms(reponseTexte, table);
  await enregistrerMessage(conv.id, "assistant", reponseFinale, {
    model: MODELE_CONVERSATION,
    tokensIn,
    tokensOut,
  });

  return {
    conversationId: conv.id,
    reponse: reponseFinale,
    tokensIn,
    tokensOut,
  };
}

// --- Conversations ---

async function chargerConversation(session: SessionVerifiee, id: string) {
  const conv = await prisma.conversation.findUnique({ where: { id } });
  if (!conv || conv.householdId !== session.householdId) {
    throw new ErreurApi("INTROUVABLE");
  }
  return conv;
}

async function creerConversation(
  session: SessionVerifiee,
  mode: "chat" | "emergency" | "onboarding",
) {
  return prisma.conversation.create({
    data: {
      householdId: session.householdId!,
      userId: session.userId,
      mode,
    },
  });
}

// --- Messages ---

async function enregistrerMessage(
  conversationId: string,
  role: "user" | "assistant" | "tool",
  content: string,
  meta?: { model?: string; tokensIn?: number; tokensOut?: number },
) {
  return prisma.message.create({
    data: {
      conversationId,
      role,
      content,
      model: meta?.model,
      tokensIn: meta?.tokensIn,
      tokensOut: meta?.tokensOut,
    },
  });
}

async function chargerHistorique(conversationId: string) {
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: MAX_MESSAGES_HISTORIQUE + 10,
    select: { role: true, content: true },
  });
}

function construireMessagesApi(
  historique: { role: string; content: unknown }[],
): Anthropic.Messages.MessageParam[] {
  const derniers = historique.slice(-MAX_MESSAGES_HISTORIQUE);
  return derniers
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: String(m.content),
    }));
}

// --- Boucle réelle (API Anthropic) ---

async function boucleReelle(
  session: SessionVerifiee,
  conversationId: string,
  systeme: string,
  messages: Anthropic.Messages.MessageParam[],
  table: TableSurnoms,
): Promise<{ texte: string; tokensIn: number; tokensOut: number }> {
  const client = creerClient();
  const outils = outilsAnthropicSchema();
  let tokensIn = 0;
  let tokensOut = 0;
  let messagesCourants = [...messages];

  for (let tour = 0; tour < MAX_TOURS_OUTILS; tour++) {
    let reponse: Anthropic.Messages.Message;
    try {
      reponse = await client.messages.create({
        model: MODELE_CONVERSATION,
        max_tokens: 1024,
        system: [{ type: "text", text: systeme, cache_control: { type: "ephemeral" } }],
        tools: outils,
        messages: messagesCourants,
      });
    } catch {
      if (tour === 0) {
        try {
          reponse = await client.messages.create({
            model: MODELE_CONVERSATION,
            max_tokens: 1024,
            system: [{ type: "text", text: systeme, cache_control: { type: "ephemeral" } }],
            tools: outils,
            messages: messagesCourants,
          });
        } catch {
          throw new ErreurApi("ERREURSERVEUR", "L'assistant est momentanément indisponible.");
        }
      } else {
        throw new ErreurApi("ERREURSERVEUR", "L'assistant est momentanément indisponible.");
      }
    }

    tokensIn += reponse.usage.input_tokens;
    tokensOut += reponse.usage.output_tokens;

    if (reponse.stop_reason === "end_turn" || reponse.stop_reason !== "tool_use") {
      const texte = extraireTexte(reponse.content);
      return { texte, tokensIn, tokensOut };
    }

    const resultatsOutils = await traiterAppelsOutils(session, reponse.content, table, conversationId);
    messagesCourants = [
      ...messagesCourants,
      { role: "assistant", content: reponse.content },
      { role: "user", content: resultatsOutils },
    ];

    for (const r of resultatsOutils) {
      if (r.type === "tool_result") {
        await enregistrerMessage(conversationId, "tool", JSON.stringify({
          toolUseId: r.tool_use_id,
          content: r.content,
        }));
      }
    }
  }

  return {
    texte: "J'ai atteint la limite de recherches pour ce message. Peux-tu reformuler ta demande ?",
    tokensIn,
    tokensOut,
  };
}

async function traiterAppelsOutils(
  session: SessionVerifiee,
  contenu: Anthropic.Messages.ContentBlock[],
  _table: TableSurnoms,
  conversationId: string,
): Promise<Anthropic.Messages.ToolResultBlockParam[]> {
  const resultats: Anthropic.Messages.ToolResultBlockParam[] = [];
  for (const bloc of contenu) {
    if (bloc.type !== "tool_use") continue;
    const outil = OUTILS.get(bloc.name);
    if (!outil) {
      resultats.push({
        type: "tool_result",
        tool_use_id: bloc.id,
        content: JSON.stringify({ erreur: `Outil inconnu : ${bloc.name}` }),
        is_error: true,
      });
      continue;
    }
    try {
      const input = outil.schema.parse(bloc.input);
      const resultat = await outil.executer(session, input, { conversationId });
      resultats.push({
        type: "tool_result",
        tool_use_id: bloc.id,
        content: JSON.stringify(resultat),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur interne de l'outil";
      resultats.push({
        type: "tool_result",
        tool_use_id: bloc.id,
        content: JSON.stringify({ erreur: message }),
        is_error: true,
      });
    }
  }
  return resultats;
}

function extraireTexte(contenu: Anthropic.Messages.ContentBlock[]): string {
  return contenu
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

// --- Boucle simulée (tests sans API) ---

async function boucleSimulee(
  session: SessionVerifiee,
  conversationId: string,
  messages: Anthropic.Messages.MessageParam[],
  table: TableSurnoms,
): Promise<{ texte: string }> {
  void messages;

  for (let tour = 0; tour < MAX_TOURS_OUTILS; tour++) {
    const reponse = prochaineReponseSimulee();
    if (!reponse) {
      return { texte: "Je suis Umi, ton assistant cuisine. Comment puis-je t'aider ?" };
    }

    if (!reponse.outils || reponse.outils.length === 0) {
      return { texte: reponse.texte ?? "" };
    }

    for (const appel of reponse.outils) {
      const outil = OUTILS.get(appel.nom);
      if (!outil) continue;
      try {
        const input = outil.schema.parse(appel.input);
        const resultat = await outil.executer(session, input, { conversationId });
        await enregistrerMessage(conversationId, "tool", JSON.stringify({
          toolUseId: appel.id,
          nom: appel.nom,
          resultat,
        }));
      } catch {
        await enregistrerMessage(conversationId, "tool", JSON.stringify({
          toolUseId: appel.id,
          nom: appel.nom,
          erreur: "Échec de l'outil en simulation",
        }));
      }
    }

    const suite = prochaineReponseSimulee();
    if (suite?.texte) {
      return { texte: restaurerSurnoms(suite.texte, table) };
    }
  }

  return { texte: "Je suis Umi, ton assistant cuisine. Comment puis-je t'aider ?" };
}
