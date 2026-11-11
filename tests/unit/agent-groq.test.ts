import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// Fournisseur Groq : conversion, lecture du flux, erreurs, choix du fournisseur, et une conversation
// complète avec Groq simulé (aucun appel réel : fetch est remplacé).

const mocks = vi.hoisted(() => ({
  conversationCreate: vi.fn(),
  messageFindMany: vi.fn(),
  messageCreate: vi.fn(),
  messageCount: vi.fn(),
  executer: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    conversation: { create: mocks.conversationCreate, findUnique: vi.fn() },
    message: {
      findMany: mocks.messageFindMany,
      create: mocks.messageCreate,
      count: mocks.messageCount,
    },
    learnedPreference: { findMany: async () => [] },
    household: { findUnique: async () => ({ equipment: [], neighborhood: null }) },
    recipe: { findMany: async () => [] },
    ingredient: { findMany: async () => [] },
  },
}));
vi.mock("@/lib/foyer/profil", () => ({
  lireFoyer: async () => ({
    id: "h1",
    name: "Famille Test",
    weeklyBudgetFcfa: 25000,
    cuisinesPreferred: [],
    shoppingDay: null,
  }),
}));
vi.mock("@/lib/foyer/membres", () => ({
  listerMembres: async () => [
    {
      id: "m1",
      label: "Awa",
      ageGroup: "child",
      birthDate: null,
      age: 8,
      allergies: ["arachide"],
      autresAllergies: [],
      regimes: [],
    },
  ],
}));
vi.mock("@/lib/stock/lecture", () => ({ lireStock: async () => [] }));
vi.mock("@/lib/planificateur/generation", () => ({ lireMenuCourant: async () => null }));
vi.mock("@/lib/foyer/age", () => ({ dateDuJour: () => "2026-11-10" }));
vi.mock("@/lib/agent/tools", () => {
  const schema = z.object({ value: z.string() }).strict();
  const outil = {
    nom: "rememberPreference",
    description: "Mémorise une préférence",
    schema,
    executer: mocks.executer,
  };
  return {
    OUTILS: new Map([["rememberPreference", outil]]),
    definitionsOutils: () => [
      {
        nom: "rememberPreference",
        description: "Mémorise une préférence",
        schema: z.toJSONSchema(schema),
      },
    ],
    outilsAnthropicSchema: () => [],
  };
});

import { fournisseurActif, resetSimulation } from "@/lib/agent/client";
import {
  LecteurFluxGroq,
  MODELEGROQPARDEFAUT,
  appelerGroq,
  delaiAvantNouvelEssai,
  limiteDuJour,
  lireArguments,
  modeleGroq,
  versOutilsGroq,
} from "@/lib/agent/fournisseurs/groq";
import {
  HISTORIQUEGROQMAX,
  historiquePourGroq,
  orchestrer,
  orchestrerStream,
  type EvenementStream,
} from "@/lib/agent/orchestrateur";
import type { SessionVerifiee } from "@/lib/auth/garde";

const SESSION: SessionVerifiee = {
  userId: "u1",
  role: "user",
  householdId: "h1",
  acces: "proprietaire",
};

/** Réponse non streamée de Groq, au format compatible OpenAI. */
const reponseGroq = (
  message: Record<string, unknown>,
  usage = { prompt_tokens: 120, completion_tokens: 30 },
) =>
  new Response(JSON.stringify({ choices: [{ message }], usage }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

/** Réponse en flux SSE, découpée en morceaux comme sur le réseau. */
const fluxGroq = (morceaux: string[]) =>
  new Response(
    new ReadableStream({
      start(controle) {
        for (const m of morceaux) controle.enqueue(new TextEncoder().encode(m));
        controle.close();
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream" } },
  );

const ligne = (morceau: unknown) => `data: ${JSON.stringify(morceau)}\n\n`;

beforeEach(() => {
  vi.clearAllMocks();
  resetSimulation();
  vi.stubEnv("ANTHROPICAPIKEY", "");
  vi.stubEnv("GROQAPIKEY", "gsk_test_cle_factice");
  vi.stubEnv("GROQMODELE", "");
  vi.stubEnv("AIDAILYQUOTA", "");
  mocks.conversationCreate.mockResolvedValue({ id: "conv-1", householdId: "h1" });
  mocks.messageCount.mockResolvedValue(0);
  mocks.messageCreate.mockResolvedValue({});
  mocks.messageFindMany.mockResolvedValue([
    { role: "user", content: "Enfant 1 n'aime pas le piment" },
  ]);
  mocks.executer.mockResolvedValue({ enregistre: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("choix du fournisseur", () => {
  it("Claude d'abord s'il a une clé, puis Groq, sinon le mode simulé", () => {
    vi.stubEnv("ANTHROPICAPIKEY", "sk-ant-factice");
    expect(fournisseurActif()).toBe("claude");
    vi.stubEnv("ANTHROPICAPIKEY", "");
    expect(fournisseurActif()).toBe("groq");
    vi.stubEnv("GROQAPIKEY", "");
    expect(fournisseurActif()).toBeNull();
  });

  it("le modèle Groq se change dans .env, avec un modèle de production par défaut", () => {
    expect(modeleGroq()).toBe(MODELEGROQPARDEFAUT);
    vi.stubEnv("GROQMODELE", "qwen/qwen3.8-27b");
    expect(modeleGroq()).toBe("qwen/qwen3.8-27b");
  });
});

describe("conversion vers Groq", () => {
  it("les outils prennent le format « function » de Groq", () => {
    const [outil] = versOutilsGroq([
      { nom: "getStock", description: "Lit le stock", schema: { type: "object" } },
    ]);
    expect(outil).toEqual({
      type: "function",
      function: { name: "getStock", description: "Lit le stock", parameters: { type: "object" } },
    });
  });

  it("les arguments JSON invalides sont gardés tels quels, pour que zod les refuse", () => {
    expect(lireArguments('{"value":"x"}')).toEqual({ value: "x" });
    expect(lireArguments("")).toEqual({});
    expect(lireArguments("{pas du json")).toBe("{pas du json");
  });
});

describe("lecture du flux de Groq", () => {
  it("transmet le texte au fur et à mesure et lit l'usage à la fin", () => {
    const recus: string[] = [];
    const lecteur = new LecteurFluxGroq((m) => recus.push(m));
    lecteur.ajouter(ligne({ choices: [{ delta: { content: "Bon" } }] }));
    lecteur.ajouter(ligne({ choices: [{ delta: { content: "soir !" } }] }));
    lecteur.ajouter(
      ligne({
        choices: [{ delta: {} }],
        x_groq: { usage: { prompt_tokens: 50, completion_tokens: 4 } },
      }),
    );
    lecteur.ajouter("data: [DONE]\n\n");
    expect(recus).toEqual(["Bon", "soir !"]);
    expect(lecteur.resultat()).toEqual({
      texte: "Bonsoir !",
      appels: [],
      tokensIn: 50,
      tokensOut: 4,
    });
  });

  it("reconstitue un appel d'outil arrivé en plusieurs morceaux, même coupés au milieu d'une ligne", () => {
    const lecteur = new LecteurFluxGroq();
    const debut = ligne({
      choices: [
        {
          delta: {
            tool_calls: [
              { index: 0, id: "call-1", function: { name: "remember", arguments: '{"val' } },
            ],
          },
        },
      ],
    });
    lecteur.ajouter(debut.slice(0, 30));
    lecteur.ajouter(debut.slice(30));
    lecteur.ajouter(
      ligne({
        choices: [
          {
            delta: {
              tool_calls: [{ index: 0, function: { name: "Preference", arguments: 'ue":"x"}' } }],
            },
          },
        ],
      }),
    );
    expect(lecteur.resultat().appels).toEqual([
      { id: "call-1", nom: "rememberPreference", arguments: '{"value":"x"}' },
    ]);
  });
});

describe("appel à Groq", () => {
  it("envoie la clé dans l'en-tête, le modèle, les outils, et lit la réponse", async () => {
    const fetchFn = vi.fn().mockResolvedValue(reponseGroq({ content: "Bonjour !" }));
    const reponse = await appelerGroq({
      messages: [{ role: "user", content: "Salut" }],
      outils: [],
      fetchFn,
    });
    expect(reponse).toEqual({ texte: "Bonjour !", appels: [], tokensIn: 120, tokensOut: 30 });
    const [url, options] = fetchFn.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(options.headers.Authorization).toBe("Bearer gsk_test_cle_factice");
    expect(JSON.parse(options.body)).toMatchObject({
      model: MODELEGROQPARDEFAUT,
      tool_choice: "auto",
      stream: false,
    });
  });

  it("réessaie une fois après une limite de débit (429)", async () => {
    const limite = new Response("", { status: 429, headers: { "retry-after": "0.01" } });
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(limite)
      .mockResolvedValueOnce(reponseGroq({ content: "Ok" }));
    expect((await appelerGroq({ messages: [], outils: [], fetchFn })).texte).toBe("Ok");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("après trois limites de débit, un message clair", async () => {
    const fetchFn = vi
      .fn()
      .mockImplementation(
        async () => new Response("", { status: 429, headers: { "retry-after": "0.01" } }),
      );
    await expect(appelerGroq({ messages: [], outils: [], fetchFn })).rejects.toThrow(
      /très demandé/,
    );
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("limite du jour atteinte : aucune attente inutile, et la vraie durée est donnée", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response("", { status: 429, headers: { "retry-after": "2065" } }));
    await expect(appelerGroq({ messages: [], outils: [], fetchFn })).rejects.toThrow(
      "Réessaie dans environ 35 minutes",
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("une limite de plusieurs heures est donnée en heures", () => {
    expect(limiteDuJour(3 * 3600).message).toContain("environ 3 h");
  });

  it("une demande trop grande pour l'offre gratuite (413) donne un message qui dit quoi faire", async () => {
    const fetchFn = vi.fn().mockResolvedValue(new Response("{}", { status: 413 }));
    await expect(appelerGroq({ messages: [], outils: [], fetchFn })).rejects.toThrow(/trop longue/);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("une clé refusée donne un message général, sans jamais journaliser la clé", async () => {
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchFn = vi.fn().mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(appelerGroq({ messages: [], outils: [], fetchFn })).rejects.toThrow(
      /momentanément indisponible/,
    );
    expect(JSON.stringify(journal.mock.calls)).not.toContain("gsk_test_cle_factice");
    journal.mockRestore();
  });

  it("sans clé Groq, aucun appel n'est fait", async () => {
    vi.stubEnv("GROQAPIKEY", "");
    const fetchFn = vi.fn();
    await expect(appelerGroq({ messages: [], outils: [], fetchFn })).rejects.toThrow();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("conversation complète avec Groq simulé", () => {
  it("exécute l'outil demandé, renvoie son résultat à Groq, et aucun surnom ne part chez Groq", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(
        reponseGroq({
          content: null,
          tool_calls: [
            {
              id: "call-1",
              type: "function",
              function: {
                name: "rememberPreference",
                arguments: '{"value":"Enfant 1 n\'aime pas le piment"}',
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(reponseGroq({ content: "C'est noté pour Enfant 1 !" }));
    vi.stubGlobal("fetch", fetchFn);

    const resultat = await orchestrer(SESSION, null, "Awa n'aime pas le piment");

    // L'outil reçoit le vrai surnom : la préférence enregistrée parle d'« Awa »
    expect(mocks.executer).toHaveBeenCalledWith(
      SESSION,
      { value: "Awa n'aime pas le piment" },
      { conversationId: "conv-1" },
    );
    // La famille voit le surnom dans la réponse
    expect(resultat.reponse).toBe("C'est noté pour Awa !");
    // Rien de ce qui part chez Groq ne contient le surnom
    const envois = fetchFn.mock.calls.map((appel) => String(appel[1].body)).join("\n");
    expect(envois).not.toContain("Awa");
    // Le second appel contient le résultat de l'outil, rattaché à son appel
    const second = JSON.parse(fetchFn.mock.calls[1][1].body);
    expect(second.messages.at(-1)).toEqual({
      role: "tool",
      tool_call_id: "call-1",
      content: '{"enregistre":true}',
    });
    // Le modèle qui a répondu est enregistré (suivi du coût)
    expect(mocks.messageCreate).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        role: "assistant",
        model: MODELEGROQPARDEFAUT,
        tokensIn: 240,
        tokensOut: 60,
      }),
    });
  });

  it("en flux : le texte arrive par morceaux, avec les surnoms remis, puis l'événement de fin", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          fluxGroq([
            ligne({ choices: [{ delta: { content: "Pour Enf" } }] }),
            ligne({ choices: [{ delta: { content: "ant 1, un garba ?" } }] }),
            "data: [DONE]\n\n",
          ]),
        ),
    );
    const evenements: EvenementStream[] = [];
    await orchestrerStream(SESSION, null, "Une idée pour Awa ?", (e) => evenements.push(e));
    const texte = evenements
      .filter((e) => e.type === "text")
      .map((e) => (e as { delta: string }).delta)
      .join("");
    expect(texte).toBe("Pour Awa, un garba ?");
    expect(evenements.at(-1)).toMatchObject({ type: "done", conversationId: "conv-1" });
  });

  it("ce sont les DERNIERS échanges qui partent, sans les messages des outils", async () => {
    // La base renvoie les plus récents d'abord (orderBy desc) : message 29 … message 10
    mocks.messageFindMany.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `message ${29 - i}`,
      })),
    );
    const fetchFn = vi.fn().mockResolvedValue(reponseGroq({ content: "Ok" }));
    vi.stubGlobal("fetch", fetchFn);
    await orchestrer(SESSION, null, "Bonjour");
    expect(mocks.messageFindMany.mock.calls[0][0]).toMatchObject({
      where: { role: { in: ["user", "assistant"] } },
      orderBy: { createdAt: "desc" },
    });
    const envoye = JSON.parse(fetchFn.mock.calls[0][1].body);
    expect(envoye.messages[0].role).toBe("system");
    expect(envoye.messages).toHaveLength(1 + HISTORIQUEGROQMAX);
    // Du plus ancien gardé au plus récent : message 18 … message 29
    expect(envoye.messages[1].content).toBe("message 18");
    expect(envoye.messages.at(-1).content).toBe("message 29");
  });

  it("les réponses de la famille restent entières, les anciennes réponses d'Umi sont raccourcies", () => {
    const long = "x".repeat(1000);
    const allege = historiquePourGroq([
      { role: "user", content: `On sera 20 personnes jeudi midi ${long}` },
      { role: "assistant", content: long },
      { role: "user", content: "Budget 100 000 FCFA" },
      { role: "assistant", content: long },
    ]);
    expect(allege[0].content.length).toBeGreaterThan(1000);
    expect(allege[1].content.length).toBeLessThan(310);
    // Les deux derniers messages restent complets
    expect(allege[3].content).toBe(long);
  });

  it("une panne de Groq devient un message clair dans le chat", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("réseau coupé")));
    const evenements: EvenementStream[] = [];
    await orchestrerStream(SESSION, null, "Bonjour", (e) => evenements.push(e));
    expect(evenements.at(-1)).toEqual({
      type: "error",
      message: "L'assistant est momentanément indisponible.",
    });
  });
});

describe("délai avant un nouvel essai après une limite de débit", () => {
  const entetes = (valeurs: Record<string, string>) => new Headers(valeurs);

  it("prend retry-after en secondes quand Groq le donne", () => {
    expect(delaiAvantNouvelEssai(entetes({ "retry-after": "12" }))).toBe(12);
  });

  it("sinon, lit la remise à zéro des jetons : « 7.66s », « 1m2s »", () => {
    expect(delaiAvantNouvelEssai(entetes({ "x-ratelimit-reset-tokens": "7.66s" }))).toBe(7.66);
    expect(delaiAvantNouvelEssai(entetes({ "x-ratelimit-reset-tokens": "1m2s" }))).toBe(62);
  });

  it("une seconde par défaut, et jamais de lecture fausse des millisecondes", () => {
    expect(delaiAvantNouvelEssai(entetes({}))).toBe(1);
    expect(delaiAvantNouvelEssai(entetes({ "x-ratelimit-reset-tokens": "16ms" }))).toBe(1);
  });
});
