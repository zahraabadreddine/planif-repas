import Anthropic from "@anthropic-ai/sdk";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { prisma } from "@/lib/db";
import { ErreurApi } from "@/lib/erreurs";
import {
  creerClient,
  estSimule,
  prochaineReponseSimulee,
  MAXTOURSOUTILS,
  MODELECONVERSATION,
} from "./client";
import { PROMPTSYSTEME } from "./prompt";
import {
  construireContexte,
  creerFluxSurnoms,
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

const MESSAGESHISTORIQUEMAX = 20;

export async function orchestrer(
  session: SessionVerifiee,
  conversationId: string | null,
  messageUtilisateur: string,
  mode: "chat" | "emergency" | "onboarding" = "chat",
): Promise<ResultatOrchestration> {
  if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

  await verifierQuotaIA(session.householdId);

  const { contexte, table } = await construireContexte(session);
  const messageAnonyme = remplacerSurnoms(messageUtilisateur, table);

  const conv = conversationId
    ? await chargerConversation(session, conversationId)
    : await creerConversation(session, mode);

  await enregistrerMessage(conv.id, "user", messageAnonyme);

  const historique = await chargerHistorique(conv.id);
  const messagesApi = construireMessagesApi(historique, table);

  const systeme = [
    PROMPTSYSTEME,
    "",
    "Contexte actuel du foyer :",
    remplacerSurnoms(formaterContextePourPrompt(contexte), table),
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
  // Enregistrée anonymisée, comme le message de la famille : l'historique renvoyé à l'IA ne contient aucun surnom
  await enregistrerMessage(conv.id, "assistant", remplacerSurnoms(reponseTexte, table), {
    model: MODELECONVERSATION,
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

export type EvenementStream =
  | { type: "status"; status: string }
  | { type: "text"; delta: string }
  | { type: "done"; conversationId: string; tokensIn: number; tokensOut: number }
  | { type: "error"; message: string };

export async function orchestrerStream(
  session: SessionVerifiee,
  conversationId: string | null,
  messageUtilisateur: string,
  envoyer: (evt: EvenementStream) => void,
  mode: "chat" | "emergency" | "onboarding" = "chat",
): Promise<void> {
  try {
    if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

    await verifierQuotaIA(session.householdId);

    envoyer({ type: "status", status: "thinking" });

    const { contexte, table } = await construireContexte(session);
    const messageAnonyme = remplacerSurnoms(messageUtilisateur, table);

    const conv = conversationId
      ? await chargerConversation(session, conversationId)
      : await creerConversation(session, mode);

    await enregistrerMessage(conv.id, "user", messageAnonyme);

    const historique = await chargerHistorique(conv.id);
    const messagesApi = construireMessagesApi(historique, table);

    const systeme = [
      PROMPTSYSTEME,
      "",
      "Contexte actuel du foyer :",
      remplacerSurnoms(formaterContextePourPrompt(contexte), table),
    ].join("\n");

    let texteComplet: string;
    let tokensIn = 0;
    let tokensOut = 0;

    if (estSimule()) {
      const r = await boucleSimulee(session, conv.id, messagesApi, table);
      texteComplet = r.texte;
      envoyer({ type: "text", delta: restaurerSurnoms(texteComplet, table) });
    } else {
      const r = await boucleReelleStream(session, conv.id, systeme, messagesApi, table, envoyer);
      texteComplet = r.texte;
      tokensIn = r.tokensIn;
      tokensOut = r.tokensOut;
    }

    await enregistrerMessage(conv.id, "assistant", remplacerSurnoms(texteComplet, table), {
      model: MODELECONVERSATION,
      tokensIn,
      tokensOut,
    });

    envoyer({ type: "done", conversationId: conv.id, tokensIn, tokensOut });
  } catch (err) {
    if (err instanceof ErreurApi) {
      envoyer({ type: "error", message: err.message });
    } else {
      envoyer({ type: "error", message: "Un problème est survenu. Réessaie plus tard." });
    }
  }
}

// --- Quota IA (ENF-18) ---

/** Messages par foyer et par jour sans AIDAILYQUOTA (ou avec une valeur invalide). */
export const QUOTAPARDEFAUT = 100;

/** Lu à chaque appel : une valeur changée dans .env est prise en compte au redémarrage du serveur. */
export function quotaJournalier(): number {
  const valeur = Number(process.env.AIDAILYQUOTA);
  return Number.isInteger(valeur) && valeur > 0 ? valeur : QUOTAPARDEFAUT;
}

async function verifierQuotaIA(householdId: string) {
  const debutJournee = new Date();
  debutJournee.setHours(0, 0, 0, 0);

  const count = await prisma.message.count({
    where: {
      conversation: { householdId },
      role: "user",
      createdAt: { gte: debutJournee },
    },
  });

  if (count >= quotaJournalier()) {
    throw new ErreurApi(
      "QUOTAATTEINT",
      "Tu as atteint la limite de messages pour aujourd'hui. Réessaie demain !",
    );
  }
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
    take: MESSAGESHISTORIQUEMAX + 10,
    select: { role: true, content: true },
  });
}

/** Derniers messages, ré-anonymisés par sécurité : un ancien message peut contenir un surnom. */
export function construireMessagesApi(
  historique: { role: string; content: unknown }[],
  table: TableSurnoms,
): Anthropic.Messages.MessageParam[] {
  const derniers = historique.slice(-MESSAGESHISTORIQUEMAX);
  return derniers
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: remplacerSurnoms(String(m.content), table),
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

  for (let tour = 0; tour < MAXTOURSOUTILS; tour++) {
    let reponse: Anthropic.Messages.Message;
    try {
      reponse = await client.messages.create({
        model: MODELECONVERSATION,
        max_tokens: 1024,
        system: [{ type: "text", text: systeme, cache_control: { type: "ephemeral" } }],
        tools: outils,
        messages: messagesCourants,
      });
    } catch {
      if (tour === 0) {
        try {
          reponse = await client.messages.create({
            model: MODELECONVERSATION,
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

    const resultatsOutils = await traiterAppelsOutils(
      session,
      reponse.content,
      table,
      conversationId,
    );
    messagesCourants = [
      ...messagesCourants,
      { role: "assistant", content: reponse.content },
      { role: "user", content: resultatsOutils },
    ];

    for (const r of resultatsOutils) {
      if (r.type === "tool_result") {
        await enregistrerMessage(
          conversationId,
          "tool",
          JSON.stringify({
            toolUseId: r.tool_use_id,
            content: r.content,
          }),
        );
      }
    }
  }

  return {
    texte: "J'ai atteint la limite de recherches pour ce message. Peux-tu reformuler ta demande ?",
    tokensIn,
    tokensOut,
  };
}

async function boucleReelleStream(
  session: SessionVerifiee,
  conversationId: string,
  systeme: string,
  messages: Anthropic.Messages.MessageParam[],
  table: TableSurnoms,
  envoyer: (evt: EvenementStream) => void,
): Promise<{ texte: string; tokensIn: number; tokensOut: number }> {
  const client = creerClient();
  const outils = outilsAnthropicSchema();
  let tokensIn = 0;
  let tokensOut = 0;
  let messagesCourants = [...messages];
  let texteAccumule = "";
  const flux = creerFluxSurnoms(table, (texte) => envoyer({ type: "text", delta: texte }));

  for (let tour = 0; tour < MAXTOURSOUTILS; tour++) {
    let reponse: Anthropic.Messages.Message;
    try {
      const stream = client.messages.stream({
        model: MODELECONVERSATION,
        max_tokens: 1024,
        system: [{ type: "text", text: systeme, cache_control: { type: "ephemeral" } }],
        tools: outils,
        messages: messagesCourants,
      });

      stream.on("text", (delta) => {
        texteAccumule += delta;
        flux.ajouter(delta);
      });

      reponse = await stream.finalMessage();
    } catch {
      if (tour === 0) {
        try {
          const stream = client.messages.stream({
            model: MODELECONVERSATION,
            max_tokens: 1024,
            system: [{ type: "text", text: systeme, cache_control: { type: "ephemeral" } }],
            tools: outils,
            messages: messagesCourants,
          });
          stream.on("text", (delta) => {
            texteAccumule += delta;
            flux.ajouter(delta);
          });
          reponse = await stream.finalMessage();
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
      flux.terminer();
      return { texte: texteAccumule, tokensIn, tokensOut };
    }

    const resultatsOutils = await traiterAppelsOutils(
      session,
      reponse.content,
      table,
      conversationId,
    );

    for (const bloc of reponse.content) {
      if (bloc.type === "tool_use") {
        envoyer({ type: "status", status: `tool:${bloc.name}` });
      }
    }

    messagesCourants = [
      ...messagesCourants,
      { role: "assistant", content: reponse.content },
      { role: "user", content: resultatsOutils },
    ];

    for (const r of resultatsOutils) {
      if (r.type === "tool_result") {
        await enregistrerMessage(
          conversationId,
          "tool",
          JSON.stringify({
            toolUseId: r.tool_use_id,
            content: r.content,
          }),
        );
      }
    }
  }

  flux.terminer();
  return {
    texte:
      texteAccumule ||
      "J'ai atteint la limite de recherches pour ce message. Peux-tu reformuler ta demande ?",
    tokensIn,
    tokensOut,
  };
}

/**
 * Arguments d'un outil écrits par l'IA, avec les libellés (« Enfant 1 ») remis en surnoms :
 * une préférence enregistrée parle d'« Awa », comme la famille.
 */
export function argumentsAvecSurnoms(input: unknown, table: TableSurnoms): unknown {
  return JSON.parse(restaurerSurnoms(JSON.stringify(input ?? {}), table));
}

/** Exécute les outils demandés ; leurs résultats et erreurs repartent vers l'IA sans aucun surnom. */
export async function traiterAppelsOutils(
  session: SessionVerifiee,
  contenu: Anthropic.Messages.ContentBlock[],
  table: TableSurnoms,
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
      const input = outil.schema.parse(argumentsAvecSurnoms(bloc.input, table));
      const resultat = await outil.executer(session, input, { conversationId });
      resultats.push({
        type: "tool_result",
        tool_use_id: bloc.id,
        content: remplacerSurnoms(JSON.stringify(resultat), table),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur interne de l'outil";
      resultats.push({
        type: "tool_result",
        tool_use_id: bloc.id,
        content: remplacerSurnoms(JSON.stringify({ erreur: message }), table),
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

  for (let tour = 0; tour < MAXTOURSOUTILS; tour++) {
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
        const input = outil.schema.parse(argumentsAvecSurnoms(appel.input, table));
        const resultat = await outil.executer(session, input, { conversationId });
        await enregistrerMessage(
          conversationId,
          "tool",
          remplacerSurnoms(
            JSON.stringify({ toolUseId: appel.id, nom: appel.nom, resultat }),
            table,
          ),
        );
      } catch {
        await enregistrerMessage(
          conversationId,
          "tool",
          JSON.stringify({
            toolUseId: appel.id,
            nom: appel.nom,
            erreur: "Échec de l'outil en simulation",
          }),
        );
      }
    }

    const suite = prochaineReponseSimulee();
    if (suite?.texte) {
      return { texte: restaurerSurnoms(suite.texte, table) };
    }
  }

  return { texte: "Je suis Umi, ton assistant cuisine. Comment puis-je t'aider ?" };
}
