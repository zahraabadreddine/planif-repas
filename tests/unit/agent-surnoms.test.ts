import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

// Règle 7 : aucun surnom de membre n'est envoyé à l'IA, ni dans le message, ni dans l'historique,
// ni dans les résultats d'outils ; la famille revoit ses surnoms à l'affichage.

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/agent/tools", () => ({
  OUTILS: new Map([
    [
      "verifierRepas",
      {
        nom: "verifierRepas",
        description: "Outil de test",
        schema: z.object({}),
        executer: async () => ({ message: "Le dîner du jour 2 ne convient pas à Awa (arachide)." }),
      },
    ],
    [
      "echouer",
      {
        nom: "echouer",
        description: "Outil de test",
        schema: z.object({}),
        executer: async () => {
          throw new Error("Zoé ne peut pas manger ce plat.");
        },
      },
    ],
    [
      "memoriser",
      {
        nom: "memoriser",
        description: "Outil de test : renvoie ce qu'il a reçu",
        schema: z.object({ value: z.string() }),
        executer: async (session: unknown, input: { value: string }) => ({
          enregistre: input.value,
        }),
      },
    ],
  ]),
  outilsAnthropicSchema: () => [],
}));

import {
  construireTableSurnoms,
  creerFluxSurnoms,
  remplacerSurnoms,
  restaurerSurnoms,
} from "@/lib/agent/context";
import {
  argumentsAvecSurnoms,
  construireMessagesApi,
  quotaJournalier,
  QUOTAPARDEFAUT,
  traiterAppelsOutils,
} from "@/lib/agent/orchestrateur";
import type { MembreFoyer } from "@/lib/foyer/membres";
import type { SessionVerifiee } from "@/lib/auth/garde";

const membre = (label: string, ageGroup: MembreFoyer["ageGroup"]): MembreFoyer => ({
  id: label,
  label,
  ageGroup,
  birthDate: null,
  age: null,
  allergies: [],
  autresAllergies: [],
  regimes: [],
});

// Awa → Enfant 1, Zoé → Enfant 2, Papa → Adulte 1
const table = construireTableSurnoms([
  membre("Awa", "child"),
  membre("Zoé", "child"),
  membre("Papa", "adult"),
]);

const SESSION: SessionVerifiee = {
  userId: "u1",
  role: "user",
  householdId: "f1",
  acces: "proprietaire",
};

describe("remplacement des surnoms", () => {
  it("remplace un surnom accentué, que \\b ne reconnaît pas", () => {
    expect(remplacerSurnoms("Zoé et Awa ont faim", table)).toBe("Enfant 2 et Enfant 1 ont faim");
  });

  it("ne remplace pas un mot qui contient le surnom", () => {
    expect(remplacerSurnoms("Papaye pour Papa", table)).toBe("Papaye pour Adulte 1");
  });

  it("restaure les surnoms, accents compris", () => {
    expect(restaurerSurnoms("Enfant 2 aime le garba", table)).toBe("Zoé aime le garba");
  });
});

describe("historique renvoyé à l'IA", () => {
  it("ne contient aucun surnom, même dans une ancienne réponse enregistrée avec", () => {
    const messages = construireMessagesApi(
      [
        { role: "user", content: "Que peut manger Enfant 1 ?" },
        { role: "assistant", content: "Pour Awa, je propose un attiéké poisson." },
        { role: "user", content: "Et pour Zoé ?" },
      ],
      table,
    );
    const texte = JSON.stringify(messages);
    expect(texte).not.toMatch(/Awa|Zoé|Papa/);
    expect(messages[1].content).toBe("Pour Enfant 1, je propose un attiéké poisson.");
  });

  it("n'envoie pas les messages d'outils", () => {
    const messages = construireMessagesApi(
      [
        { role: "user", content: "Bonjour" },
        { role: "tool", content: "{}" },
      ],
      table,
    );
    expect(messages).toHaveLength(1);
  });
});

describe("résultats d'outils renvoyés à l'IA", () => {
  it("anonymise un résultat qui cite un membre", async () => {
    const [resultat] = await traiterAppelsOutils(
      SESSION,
      [{ type: "tool_use", id: "t1", name: "verifierRepas", input: {} } as never],
      table,
      "conv-1",
    );
    expect(resultat.content).not.toContain("Awa");
    expect(resultat.content).toContain("Enfant 1");
  });

  it("anonymise aussi le message d'erreur d'un outil", async () => {
    const [resultat] = await traiterAppelsOutils(
      SESSION,
      [{ type: "tool_use", id: "t2", name: "echouer", input: {} } as never],
      table,
      "conv-1",
    );
    expect(resultat.is_error).toBe(true);
    expect(resultat.content).not.toContain("Zoé");
    expect(resultat.content).toContain("Enfant 2");
  });
});

describe("arguments d'outils écrits par l'IA", () => {
  it("remet les surnoms avant d'exécuter l'outil : la famille ne voit jamais « Enfant 1 » enregistré", () => {
    expect(argumentsAvecSurnoms({ value: "Enfant 1 n'aime pas le piment" }, table)).toEqual({
      value: "Awa n'aime pas le piment",
    });
  });

  it("l'outil reçoit le surnom, et sa réponse repart anonymisée vers l'IA", async () => {
    const [resultat] = await traiterAppelsOutils(
      SESSION,
      [
        {
          type: "tool_use",
          id: "t3",
          name: "memoriser",
          input: { value: "Enfant 2 adore le garba" },
        } as never,
      ],
      table,
      "conv-1",
    );
    expect(resultat.content).toBe(JSON.stringify({ enregistre: "Enfant 2 adore le garba" }));
  });
});

describe("affichage en flux", () => {
  function recevoir(morceaux: string[]) {
    const affiches: string[] = [];
    const flux = creerFluxSurnoms(table, (texte) => affiches.push(texte));
    for (const morceau of morceaux) flux.ajouter(morceau);
    flux.terminer();
    return affiches;
  }

  it("restaure un libellé coupé entre deux morceaux", () => {
    expect(recevoir(["Pour Enf", "ant 1, un plat ", "rapide."]).join("")).toBe(
      "Pour Awa, un plat rapide.",
    );
  });

  it("n'affiche jamais un libellé à moitié", () => {
    const affiches = recevoir(["Bonsoir ! Pour Adu", "lte 1 et Enfant 2, ", "voici une idée."]);
    expect(affiches.join("")).toBe("Bonsoir ! Pour Papa et Zoé, voici une idée.");
    expect(affiches.some((texte) => /Adu|Enfant|Adulte/.test(texte))).toBe(false);
  });

  it("affiche le texte sans libellé dès qu'il arrive, sauf la fin gardée de côté", () => {
    const affiches = recevoir(["Le garba est un plat ivoirien très apprécié."]);
    expect(affiches.join("")).toBe("Le garba est un plat ivoirien très apprécié.");
  });
});

describe("quota de messages par jour", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lit AIDAILYQUOTA, le nom prévu dans .env.example", () => {
    vi.stubEnv("AIDAILYQUOTA", "5");
    expect(quotaJournalier()).toBe(5);
  });

  it("garde la valeur par défaut sans variable ou avec une valeur invalide", () => {
    vi.stubEnv("AIDAILYQUOTA", "");
    expect(quotaJournalier()).toBe(QUOTAPARDEFAUT);
    vi.stubEnv("AIDAILYQUOTA", "beaucoup");
    expect(quotaJournalier()).toBe(QUOTAPARDEFAUT);
    vi.stubEnv("AIDAILYQUOTA", "-3");
    expect(quotaJournalier()).toBe(QUOTAPARDEFAUT);
  });
});

describe("surnom qui est aussi un mot du catalogue", () => {
  // Un membre surnommé « Riz », et un catalogue qui contient « Riz gras au poulet » et « Riz »
  const avecRiz = construireTableSurnoms(
    [membre("Riz", "adult")],
    ["Riz gras au poulet", "Riz", "Attiéké poisson braisé"],
  );

  it("ne abîme pas un nom de recette qui contient le surnom", () => {
    expect(remplacerSurnoms("Riz aime le riz gras au poulet", avecRiz)).toBe(
      "Adulte 1 aime le riz gras au poulet",
    );
  });

  it("la vie privée passe d'abord : un ingrédient identique au surnom est quand même remplacé", () => {
    expect(remplacerSurnoms("Il reste du riz", avecRiz)).toBe("Il reste du Adulte 1");
  });

  it("garde le comportement habituel sans catalogue", () => {
    expect(
      remplacerSurnoms("Riz gras pour Riz", construireTableSurnoms([membre("Riz", "adult")])),
    ).toBe("Adulte 1 gras pour Adulte 1");
  });
});
