import { ErreurApi } from "@/lib/erreurs";

// Fournisseur d'IA Groq (§10, ENF-21) : API compatible OpenAI, appelée avec fetch (aucune dépendance).
// Utilisé quand ANTHROPICAPIKEY est vide et GROQAPIKEY renseignée. Claude reste le fournisseur prévu ;
// les mêmes règles s'appliquent : anonymisation, outils vérifiés par zod, propositions à confirmer.

export const GROQURL = "https://api.groq.com/openai/v1/chat/completions";

/** Modèle de production qui sait appeler des outils, accessible à un compte gratuit (vérifié en novembre 2026). Remplaçable par GROQMODELE. */
export const MODELEGROQPARDEFAUT = "openai/gpt-oss-120b";

/** Comme pour Claude : une réponse courte suffit à un chat de cuisine, et limite le coût. */
const JETONSREPONSEMAX = 1024;

/**
 * Attente maximale avant de réessayer après une limite de débit (secondes). L'offre gratuite de Groq
 * limite les jetons par minute : mieux vaut qu'Umi « réfléchisse » un peu plus qu'afficher une erreur.
 */
const ATTENTEMAX = 60;

/** Essais pour un même appel : une réponse d'Umi enchaîne plusieurs appels, la limite par minute est vite atteinte. */
const ESSAISMAX = 3;

/** Délai demandé par Groq : retry-after en secondes, sinon la remise à zéro des jetons (« 7.66s », « 1m2s »). */
export function delaiAvantNouvelEssai(entetes: Headers): number {
  const apres = Number(entetes.get("retry-after"));
  if (Number.isFinite(apres) && apres > 0) return apres;
  const remise = entetes.get("x-ratelimit-reset-tokens") ?? "";
  const minutes = Number(/(\d+(?:\.\d+)?)m(?!s)/.exec(remise)?.[1] ?? 0);
  const secondes = Number(/(\d+(?:\.\d+)?)s/.exec(remise)?.[1] ?? 0);
  return minutes * 60 + secondes || 1;
}

/** « Réessaie dans environ 35 minutes » : la durée vient de Groq, arrondie par le code. */
export function limiteDuJour(secondes: number): ErreurApi {
  const minutes = Math.ceil(secondes / 60);
  const duree =
    minutes >= 60 ? `environ ${Math.round(minutes / 60)} h` : `environ ${minutes} minutes`;
  return new ErreurApi(
    "ERREURSERVEUR",
    `L'assistant a atteint sa limite d'utilisation pour le moment. Réessaie dans ${duree}.`,
  );
}

export function modeleGroq(): string {
  return process.env.GROQMODELE?.trim() || MODELEGROQPARDEFAUT;
}

export type AppelGroq = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type MessageGroq =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: AppelGroq[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type OutilGroq = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export type DefinitionOutil = { nom: string; description: string; schema: Record<string, unknown> };

/** Appel d'outil demandé par le modèle ; les arguments restent la chaîne JSON reçue. */
export type AppelOutilGroq = { id: string; nom: string; arguments: string };

export type ReponseGroq = {
  texte: string;
  appels: AppelOutilGroq[];
  tokensIn: number;
  tokensOut: number;
};

export function versOutilsGroq(definitions: DefinitionOutil[]): OutilGroq[] {
  return definitions.map((d) => ({
    type: "function",
    function: { name: d.nom, description: d.description, parameters: d.schema },
  }));
}

/** Arguments d'un appel d'outil : objet JSON, ou la chaîne brute si le modèle a écrit un JSON invalide. */
export function lireArguments(texte: string): unknown {
  if (texte.trim() === "") return {};
  try {
    return JSON.parse(texte);
  } catch {
    // zod refusera la chaîne : l'outil renvoie une erreur lisible que le modèle peut corriger
    return texte;
  }
}

type Usage = { prompt_tokens?: number; completion_tokens?: number };

type MorceauFlux = {
  choices?: {
    delta?: {
      content?: string | null;
      tool_calls?: {
        index: number;
        id?: string;
        function?: { name?: string; arguments?: string };
      }[];
    };
  }[];
  usage?: Usage;
  x_groq?: { usage?: Usage };
};

/**
 * Lecture du flux SSE de Groq, morceau par morceau : le texte est transmis au fur et à mesure,
 * les appels d'outils sont reconstitués (le nom et les arguments arrivent en plusieurs morceaux).
 */
export class LecteurFluxGroq {
  private reste = "";
  private texte = "";
  private readonly appels = new Map<number, AppelOutilGroq>();
  private tokensIn = 0;
  private tokensOut = 0;

  constructor(private readonly surTexte?: (morceau: string) => void) {}

  ajouter(donnees: string): void {
    this.reste += donnees;
    const lignes = this.reste.split("\n");
    this.reste = lignes.pop() ?? "";
    for (const ligne of lignes) this.lireLigne(ligne.trim());
  }

  private lireLigne(ligne: string): void {
    if (!ligne.startsWith("data:")) return;
    const charge = ligne.slice(5).trim();
    if (charge === "" || charge === "[DONE]") return;
    let morceau: MorceauFlux;
    try {
      morceau = JSON.parse(charge) as MorceauFlux;
    } catch {
      return;
    }
    const usage = morceau.usage ?? morceau.x_groq?.usage;
    if (usage) {
      this.tokensIn = usage.prompt_tokens ?? this.tokensIn;
      this.tokensOut = usage.completion_tokens ?? this.tokensOut;
    }
    const delta = morceau.choices?.[0]?.delta;
    if (delta?.content) {
      this.texte += delta.content;
      this.surTexte?.(delta.content);
    }
    for (const appel of delta?.tool_calls ?? []) {
      const courant = this.appels.get(appel.index) ?? { id: "", nom: "", arguments: "" };
      if (appel.id) courant.id = appel.id;
      if (appel.function?.name) courant.nom += appel.function.name;
      if (appel.function?.arguments) courant.arguments += appel.function.arguments;
      this.appels.set(appel.index, courant);
    }
  }

  resultat(): ReponseGroq {
    if (this.reste.trim()) this.lireLigne(this.reste.trim());
    this.reste = "";
    return {
      texte: this.texte,
      appels: [...this.appels.entries()]
        .sort(([a], [b]) => a - b)
        .map(([index, appel]) => ({ ...appel, id: appel.id || `appel-${index}` })),
      tokensIn: this.tokensIn,
      tokensOut: this.tokensOut,
    };
  }
}

type ReponseComplete = {
  choices?: {
    message?: { content?: string | null; tool_calls?: AppelGroq[] };
  }[];
  usage?: Usage;
};

function versReponse(corps: ReponseComplete): ReponseGroq {
  const message = corps.choices?.[0]?.message;
  return {
    texte: message?.content ?? "",
    appels: (message?.tool_calls ?? []).map((a, i) => ({
      id: a.id || `appel-${i}`,
      nom: a.function.name,
      arguments: a.function.arguments ?? "",
    })),
    tokensIn: corps.usage?.prompt_tokens ?? 0,
    tokensOut: corps.usage?.completion_tokens ?? 0,
  };
}

const indisponible = () =>
  new ErreurApi("ERREURSERVEUR", "L'assistant est momentanément indisponible.");

const attendre = (secondes: number) =>
  new Promise((resolve) => setTimeout(resolve, Math.min(secondes, ATTENTEMAX) * 1000));

export type DemandeGroq = {
  messages: MessageGroq[];
  outils: OutilGroq[];
  // Avec surTexte, la réponse arrive en flux et chaque morceau de texte est transmis aussitôt
  surTexte?: (morceau: string) => void;
  fetchFn?: typeof fetch;
};

/**
 * Un tour de conversation avec Groq. Comme pour Claude : un nouvel essai en cas de limite de débit
 * ou de panne, puis un message clair. La clé n'apparaît jamais dans un message d'erreur ni un log.
 */
export async function appelerGroq(demande: DemandeGroq): Promise<ReponseGroq> {
  const cle = process.env.GROQAPIKEY ?? "";
  if (!cle) throw indisponible();
  const fetchFn = demande.fetchFn ?? fetch;
  const enFlux = demande.surTexte !== undefined;
  const corps = JSON.stringify({
    model: modeleGroq(),
    messages: demande.messages,
    tools: demande.outils,
    tool_choice: "auto",
    max_completion_tokens: JETONSREPONSEMAX,
    stream: enFlux,
  });

  for (let essai = 0; essai < ESSAISMAX; essai++) {
    const dernier = essai === ESSAISMAX - 1;
    let reponse: Response;
    try {
      reponse = await fetchFn(GROQURL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cle}` },
        body: corps,
      });
    } catch {
      if (!dernier) continue;
      throw indisponible();
    }

    if (reponse.status === 429) {
      const delai = delaiAvantNouvelEssai(reponse.headers);
      // Limite du jour (200 000 jetons) : Groq demande d'attendre bien plus d'une minute
      if (delai > ATTENTEMAX) throw limiteDuJour(delai);
    }
    if (reponse.status === 429 || reponse.status >= 500) {
      if (!dernier) {
        await attendre(reponse.status === 429 ? delaiAvantNouvelEssai(reponse.headers) : 1);
        continue;
      }
      throw reponse.status === 429
        ? new ErreurApi(
            "ERREURSERVEUR",
            "L'assistant est très demandé en ce moment. Réessaie dans une minute.",
          )
        : indisponible();
    }
    if (reponse.status === 413) {
      // Une seule demande dépasse la limite de jetons par minute de l'offre gratuite
      throw new ErreurApi(
        "ERREURSERVEUR",
        "Ta demande est trop longue pour l'assistant en ce moment. Écris un message plus court, ou ouvre une nouvelle conversation.",
      );
    }
    if (!reponse.ok) {
      // Clé refusée, modèle inconnu, requête invalide : seul le code est journalisé, jamais la clé
      console.error("Groq a refusé la requête", reponse.status);
      throw indisponible();
    }

    if (!enFlux || !reponse.body) return versReponse((await reponse.json()) as ReponseComplete);

    const lecteur = new LecteurFluxGroq(demande.surTexte);
    const decodeur = new TextDecoder();
    const flux = reponse.body.getReader();
    for (;;) {
      const { value, done } = await flux.read();
      if (done) break;
      lecteur.ajouter(decodeur.decode(value, { stream: true }));
    }
    return lecteur.resultat();
  }
  throw indisponible();
}
