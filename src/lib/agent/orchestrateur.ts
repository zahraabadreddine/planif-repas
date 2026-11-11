import Anthropic from "@anthropic-ai/sdk";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { prisma } from "@/lib/db";
import { ErreurApi } from "@/lib/erreurs";
import {
  creerClient,
  estSimule,
  fournisseurActif,
  prochaineReponseSimulee,
  MAXTOURSOUTILS,
  MODELECONVERSATION,
} from "./client";
import {
  appelerGroq,
  lireArguments,
  modeleGroq,
  versOutilsGroq,
  type MessageGroq,
} from "./fournisseurs/groq";
import { PROMPTSYSTEME } from "./prompt";
import {
  construireContexte,
  creerFluxSurnoms,
  formaterContextePourPrompt,
  remplacerSurnoms,
  restaurerSurnoms,
  type TableSurnoms,
} from "./context";
import { OUTILS, definitionsOutils, outilsAnthropicSchema } from "./tools";
import type { CarteChat } from "./tools/types";

export type ResultatOrchestration = {
  conversationId: string;
  reponse: string;
  tokensIn: number;
  tokensOut: number;
};

const MESSAGESHISTORIQUEMAX = 20;

/**
 * Plafond de la réponse de Claude. Sa réflexion (toujours active sur Sonnet 5.5) compte dedans :
 * trop bas, elle couperait la réponse. On ne paie que ce qui est réellement produit.
 */
const JETONSREPONSECLAUDE = 8000;

/** Effort conseillé pour une discussion : réflexion courte, réponses plus rapides et moins chères. */
const EFFORTCONVERSATION = "low" as const;

/** Recherches de recettes permises pour un même message : au-delà, Umi tournerait en rond. */
export const RECHERCHESMAX = 2;

/** Appels déjà faits pendant la réponse à un message, par outil. */
type Compteur = Map<string, number>;

/** Messages d'historique envoyés à Groq (demandes limitées à 8 000 jetons par minute). */
export const HISTORIQUEGROQMAX = 12;

/** Longueur gardée d'une ancienne réponse d'Umi : les réponses de la famille restent entières. */
const REPONSEANCIENNEMAX = 300;

/**
 * Historique allégé pour Groq : les messages de la famille restent entiers (ses réponses :
 * nombre d'invités, date, budget…), les anciennes réponses d'Umi sont raccourcies.
 */
export function historiquePourGroq(
  historique: { role: string; content: unknown }[],
): { role: "user" | "assistant"; content: string }[] {
  const derniers = historique.slice(-HISTORIQUEGROQMAX);
  return derniers.map((m, i) => {
    const texte = String(m.content);
    const ancienne = m.role === "assistant" && i < derniers.length - 2;
    return {
      role: m.role === "assistant" ? "assistant" : "user",
      content:
        ancienne && texte.length > REPONSEANCIENNEMAX
          ? `${texte.slice(0, REPONSEANCIENNEMAX)}…`
          : texte,
    };
  });
}

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
    const r =
      fournisseurActif() === "groq"
        ? await boucleGroq(session, conv.id, systeme, messagesApi, table)
        : await boucleReelle(session, conv.id, systeme, messagesApi, table);
    reponseTexte = r.texte;
    tokensIn = r.tokensIn;
    tokensOut = r.tokensOut;
  }

  const reponseFinale = restaurerSurnoms(reponseTexte, table);
  // Enregistrée anonymisée, comme le message de la famille : l'historique renvoyé à l'IA ne contient aucun surnom
  await enregistrerMessage(conv.id, "assistant", remplacerSurnoms(reponseTexte, table), {
    model: modeleUtilise(),
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
  | { type: "error"; message: string }
  | CarteChat;

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
      const r =
        fournisseurActif() === "groq"
          ? await boucleGroq(session, conv.id, systeme, messagesApi, table, envoyer)
          : await boucleReelleStream(session, conv.id, systeme, messagesApi, table, envoyer);
      texteComplet = r.texte;
      tokensIn = r.tokensIn;
      tokensOut = r.tokensOut;
    }

    await enregistrerMessage(conv.id, "assistant", remplacerSurnoms(texteComplet, table), {
      model: modeleUtilise(),
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

/** Les derniers échanges de la famille et d'Umi, du plus ancien au plus récent. */
async function chargerHistorique(conversationId: string) {
  const derniers = await prisma.message.findMany({
    where: { conversationId, role: { in: ["user", "assistant"] } },
    orderBy: { createdAt: "desc" },
    take: MESSAGESHISTORIQUEMAX,
    select: { role: true, content: true },
  });
  return derniers.reverse();
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

  const compteur: Compteur = new Map();
  for (let tour = 0; tour < MAXTOURSOUTILS; tour++) {
    let reponse: Anthropic.Messages.Message;
    try {
      reponse = await client.messages.create({
        model: MODELECONVERSATION,
        max_tokens: JETONSREPONSECLAUDE,
        output_config: { effort: EFFORTCONVERSATION },
        system: [{ type: "text", text: systeme, cache_control: { type: "ephemeral" } }],
        tools: outils,
        messages: messagesCourants,
      });
    } catch {
      if (tour === 0) {
        try {
          reponse = await client.messages.create({
            model: MODELECONVERSATION,
            max_tokens: JETONSREPONSECLAUDE,
            output_config: { effort: EFFORTCONVERSATION },
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
      undefined,
      compteur,
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

  const compteur: Compteur = new Map();
  for (let tour = 0; tour < MAXTOURSOUTILS; tour++) {
    let reponse: Anthropic.Messages.Message;
    try {
      const stream = client.messages.stream({
        model: MODELECONVERSATION,
        max_tokens: JETONSREPONSECLAUDE,
        output_config: { effort: EFFORTCONVERSATION },
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
            max_tokens: JETONSREPONSECLAUDE,
            output_config: { effort: EFFORTCONVERSATION },
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
      envoyer,
      compteur,
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

/**
 * Exécute un outil demandé par l'IA, quel que soit le fournisseur : arguments remis en surnoms puis
 * vérifiés par zod, résultat ou erreur anonymisé avant de repartir vers l'IA (règles 1 et 7).
 */
export async function executerOutil(
  session: SessionVerifiee,
  appel: { nom: string; input: unknown },
  table: TableSurnoms,
  conversationId: string,
  afficher?: (carte: CarteChat) => void,
  compteur?: Compteur,
): Promise<{ contenu: string; erreur: boolean }> {
  const outil = OUTILS.get(appel.nom);
  if (!outil) {
    return { contenu: JSON.stringify({ erreur: `Outil inconnu : ${appel.nom}` }), erreur: true };
  }
  const deja = (compteur?.get(appel.nom) ?? 0) + 1;
  compteur?.set(appel.nom, deja);
  if (appel.nom === "searchRecipes" && deja > RECHERCHESMAX) {
    return {
      contenu: JSON.stringify({
        erreur:
          "Plus de recherche pour ce message : le catalogue n'a pas ce plat. Propose une idée avec listerIngredientsPermis puis proposerIdeePlat, ou réponds avec ce que tu as.",
      }),
      erreur: true,
    };
  }
  try {
    const input = outil.schema.parse(argumentsAvecSurnoms(appel.input, table));
    const resultat = await outil.executer(session, input, { conversationId, afficher });
    return { contenu: remplacerSurnoms(JSON.stringify(resultat), table), erreur: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur interne de l'outil";
    return { contenu: remplacerSurnoms(JSON.stringify({ erreur: message }), table), erreur: true };
  }
}

/** Exécute les outils demandés ; leurs résultats et erreurs repartent vers l'IA sans aucun surnom. */
export async function traiterAppelsOutils(
  session: SessionVerifiee,
  contenu: Anthropic.Messages.ContentBlock[],
  table: TableSurnoms,
  conversationId: string,
  afficher?: (carte: CarteChat) => void,
  compteur?: Compteur,
): Promise<Anthropic.Messages.ToolResultBlockParam[]> {
  const resultats: Anthropic.Messages.ToolResultBlockParam[] = [];
  for (const bloc of contenu) {
    if (bloc.type !== "tool_use") continue;
    const { contenu: texte, erreur } = await executerOutil(
      session,
      { nom: bloc.name, input: bloc.input },
      table,
      conversationId,
      afficher,
      compteur,
    );
    resultats.push({
      type: "tool_result",
      tool_use_id: bloc.id,
      content: texte,
      ...(erreur ? { is_error: true } : {}),
    });
  }
  return resultats;
}

/** Modèle qui répond vraiment, enregistré avec chaque message (ENF-18 : suivi du coût). */
function modeleUtilise(): string {
  return fournisseurActif() === "groq" ? modeleGroq() : MODELECONVERSATION;
}

/**
 * Boucle d'outils avec Groq : mêmes limites et mêmes protections que la boucle Claude
 * (8 tours au plus, outils vérifiés, surnoms jamais envoyés, libellés jamais coupés à l'affichage).
 */
async function boucleGroq(
  session: SessionVerifiee,
  conversationId: string,
  systeme: string,
  historique: Anthropic.Messages.MessageParam[],
  table: TableSurnoms,
  envoyer?: (evt: EvenementStream) => void,
): Promise<{ texte: string; tokensIn: number; tokensOut: number }> {
  const outils = versOutilsGroq(definitionsOutils());
  // L'offre gratuite de Groq limite chaque demande à 8 000 jetons : seuls les derniers échanges partent
  const messages: MessageGroq[] = [
    { role: "system", content: systeme },
    ...(historiquePourGroq(historique) as MessageGroq[]),
  ];
  const flux = envoyer
    ? creerFluxSurnoms(table, (texte) => envoyer({ type: "text", delta: texte }))
    : null;
  let texteAccumule = "";
  let tokensIn = 0;
  let tokensOut = 0;

  const compteur: Compteur = new Map();
  for (let tour = 0; tour < MAXTOURSOUTILS; tour++) {
    const reponse = await appelerGroq({
      messages,
      outils,
      surTexte: flux ? (morceau) => flux.ajouter(morceau) : undefined,
    });
    tokensIn += reponse.tokensIn;
    tokensOut += reponse.tokensOut;
    texteAccumule += reponse.texte;

    if (reponse.appels.length === 0) {
      flux?.terminer();
      return { texte: texteAccumule, tokensIn, tokensOut };
    }

    messages.push({
      role: "assistant",
      content: reponse.texte || null,
      tool_calls: reponse.appels.map((a) => ({
        id: a.id,
        type: "function",
        function: { name: a.nom, arguments: a.arguments || "{}" },
      })),
    });
    for (const appel of reponse.appels) {
      envoyer?.({ type: "status", status: `tool:${appel.nom}` });
      const { contenu } = await executerOutil(
        session,
        { nom: appel.nom, input: lireArguments(appel.arguments) },
        table,
        conversationId,
        envoyer,
        compteur,
      );
      messages.push({ role: "tool", tool_call_id: appel.id, content: contenu });
      await enregistrerMessage(
        conversationId,
        "tool",
        JSON.stringify({ toolUseId: appel.id, nom: appel.nom, content: contenu }),
      );
    }
  }

  flux?.terminer();
  return {
    texte:
      texteAccumule ||
      "J'ai atteint la limite de recherches pour ce message. Peux-tu reformuler ta demande ?",
    tokensIn,
    tokensOut,
  };
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
