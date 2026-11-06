import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks hoistés (vi.hoisted pour éviter le problème de référence) ---

const mocks = vi.hoisted(() => ({
  conversationCreate: vi.fn(),
  conversationFindUnique: vi.fn(),
  messageFindMany: vi.fn(),
  messageCreate: vi.fn(),
  learnedPreferenceFindMany: vi.fn(),
  householdFindUnique: vi.fn(),
  lireFoyer: vi.fn(),
  listerMembres: vi.fn(),
  lireStock: vi.fn(),
  lireMenuCourant: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    conversation: { create: mocks.conversationCreate, findUnique: mocks.conversationFindUnique },
    message: { findMany: mocks.messageFindMany, create: mocks.messageCreate },
    learnedPreference: { findMany: mocks.learnedPreferenceFindMany },
    household: { findUnique: mocks.householdFindUnique },
  },
}));

vi.mock("@/lib/foyer/profil", () => ({ lireFoyer: mocks.lireFoyer }));
vi.mock("@/lib/foyer/membres", () => ({ listerMembres: mocks.listerMembres }));
vi.mock("@/lib/stock/lecture", () => ({ lireStock: mocks.lireStock }));
vi.mock("@/lib/planificateur/generation", () => ({
  lireMenuCourant: mocks.lireMenuCourant,
  exigerFoyer: vi.fn(),
}));
vi.mock("@/lib/foyer/age", () => ({ dateDuJour: () => "2026-11-06" }));

vi.mock("@/lib/agent/client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/agent/client")>(
    "@/lib/agent/client",
  );
  return {
    ...actual,
    estSimule: () => true,
    apiDisponible: () => false,
  };
});

import {
  simulerReponses,
  resetSimulation,
} from "@/lib/agent/client";
import { orchestrer } from "@/lib/agent/orchestrateur";
import { OUTILS, outilsAnthropicSchema } from "@/lib/agent/tools";
import type { SessionVerifiee } from "@/lib/auth/garde";

const SESSION: SessionVerifiee = {
  userId: "u1",
  role: "user" as const,
  householdId: "h1",
  acces: "proprietaire" as const,
};

function mockFoyerVide() {
  mocks.lireFoyer.mockResolvedValue({
    id: "h1",
    name: "Famille Test",
    weeklyBudgetFcfa: 25000,
    cuisinesPreferred: ["ivoirienne"],
    shoppingDay: null,
  });
  mocks.listerMembres.mockResolvedValue([]);
  mocks.lireStock.mockResolvedValue([]);
  mocks.lireMenuCourant.mockResolvedValue(null);
  mocks.learnedPreferenceFindMany.mockResolvedValue([]);
  mocks.householdFindUnique.mockResolvedValue({ equipment: [], neighborhood: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetSimulation();
  mockFoyerVide();

  mocks.conversationCreate.mockResolvedValue({ id: "conv-1", householdId: "h1" });
  mocks.conversationFindUnique.mockResolvedValue({ id: "conv-1", householdId: "h1" });
  mocks.messageFindMany.mockResolvedValue([]);
  mocks.messageCreate.mockResolvedValue({ id: "msg-1" });
});

// --- Tests du registre d'outils ---

describe("registre d'outils", () => {
  it("contient les 6 outils lecture", () => {
    expect(OUTILS.size).toBe(6);
    expect(OUTILS.has("getHouseholdProfile")).toBe(true);
    expect(OUTILS.has("getWeekPlan")).toBe(true);
    expect(OUTILS.has("getStock")).toBe(true);
    expect(OUTILS.has("searchRecipes")).toBe(true);
    expect(OUTILS.has("findRecipesFromStock")).toBe(true);
    expect(OUTILS.has("findWhereToBuy")).toBe(true);
  });

  it("génère le schéma Anthropic pour chaque outil", () => {
    const schemas = outilsAnthropicSchema();
    expect(schemas).toHaveLength(6);
    for (const s of schemas) {
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.input_schema).toBeDefined();
      expect(s.input_schema.type).toBe("object");
    }
  });
});

// --- Tests de l'orchestrateur ---

describe("orchestrer", () => {
  it("renvoie la réponse simulée simple", async () => {
    simulerReponses([{ texte: "Bonjour ! Que veux-tu cuisiner ?" }]);

    const resultat = await orchestrer(SESSION, null, "Bonjour");

    expect(resultat.conversationId).toBe("conv-1");
    expect(resultat.reponse).toBe("Bonjour ! Que veux-tu cuisiner ?");
    expect(mocks.conversationCreate).toHaveBeenCalledOnce();
    expect(mocks.messageCreate).toHaveBeenCalledTimes(2);
  });

  it("utilise une conversation existante si l'id est fourni", async () => {
    simulerReponses([{ texte: "D'accord !" }]);

    await orchestrer(SESSION, "conv-1", "Merci");

    expect(mocks.conversationCreate).not.toHaveBeenCalled();
    expect(mocks.conversationFindUnique).toHaveBeenCalledWith({ where: { id: "conv-1" } });
  });

  it("refuse si le foyer manque", async () => {
    const sansfoyer = { ...SESSION, householdId: null };
    await expect(orchestrer(sansfoyer, null, "test")).rejects.toThrow("foyer");
  });

  it("refuse si la conversation n'appartient pas au foyer", async () => {
    mocks.conversationFindUnique.mockResolvedValue({ id: "conv-x", householdId: "autre" });
    await expect(orchestrer(SESSION, "conv-x", "test")).rejects.toThrow();
  });

  it("exécute un outil simulé et renvoie la réponse suivante", async () => {
    simulerReponses([
      {
        outils: [{ id: "tu-1", nom: "getStock", input: {} }],
      },
      { texte: "Ton stock est vide, il faut faire les courses !" },
    ]);

    const resultat = await orchestrer(SESSION, null, "Qu'est-ce qu'il y a dans le frigo ?");

    expect(resultat.reponse).toBe("Ton stock est vide, il faut faire les courses !");
    expect(mocks.messageCreate).toHaveBeenCalledTimes(3);
  });

  it("renvoie un message par défaut sans réponse simulée", async () => {
    const resultat = await orchestrer(SESSION, null, "test");
    expect(resultat.reponse).toContain("Umi");
  });

  it("restaure les surnoms dans la réponse", async () => {
    mocks.listerMembres.mockResolvedValue([
      {
        id: "m1",
        label: "Aminata",
        birthDate: null,
        ageGroup: "adult",
        age: 35,
        allergies: [],
        autresAllergies: [],
        regimes: [],
      },
    ]);
    simulerReponses([{ texte: "Adulte 1 devrait manger plus de légumes." }]);

    const resultat = await orchestrer(SESSION, null, "Des conseils ?");

    expect(resultat.reponse).toBe("Aminata devrait manger plus de légumes.");
  });
});
