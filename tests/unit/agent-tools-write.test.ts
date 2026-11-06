import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  genererListe: vi.fn(),
  plannedMealFindUnique: vi.fn(),
  mealFeedbackCreate: vi.fn(),
  learnedPreferenceFindFirst: vi.fn(),
  learnedPreferenceCreate: vi.fn(),
  learnedPreferenceUpdate: vi.fn(),
}));

vi.mock("@/lib/courses/generation", () => ({
  genererListe: mocks.genererListe,
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    plannedMeal: { findUnique: mocks.plannedMealFindUnique },
    mealFeedback: { create: mocks.mealFeedbackCreate },
    learnedPreference: {
      findFirst: mocks.learnedPreferenceFindFirst,
      create: mocks.learnedPreferenceCreate,
      update: mocks.learnedPreferenceUpdate,
    },
  },
}));

import { buildShoppingList } from "@/lib/agent/tools/build-shopping-list";
import { recordMealFeedback } from "@/lib/agent/tools/record-meal-feedback";
import { rememberPreference } from "@/lib/agent/tools/remember-preference";
import type { SessionVerifiee } from "@/lib/auth/garde";

const SESSION: SessionVerifiee = {
  userId: "u1",
  role: "user" as const,
  householdId: "h1",
  acces: "proprietaire" as const,
};
const CTX = { conversationId: "conv-1" };

beforeEach(() => {
  vi.clearAllMocks();
});

// --- buildShoppingList ---

describe("buildShoppingList", () => {
  it("génère la liste et renvoie le résumé", async () => {
    mocks.genererListe.mockResolvedValue({
      id: "list-1",
      mealPlanId: "mp-1",
      estimatedTotalFcfa: 15000,
      remainingFcfa: 15000,
      sharedAt: null,
      items: [
        {
          id: "item-1",
          ingredientId: "ing-1",
          ingredient: "Tomate",
          quantity: 3,
          unit: "tas",
          estimatedPriceFcfa: 1500,
          placeType: "market",
          checked: false,
        },
        {
          id: "item-2",
          ingredientId: "ing-2",
          ingredient: "Riz",
          quantity: 2,
          unit: "kg",
          estimatedPriceFcfa: 1200,
          placeType: "supermarket",
          checked: false,
        },
      ],
    });

    const result = await buildShoppingList.executer(
      SESSION,
      { mealPlanId: "mp-1" },
      CTX,
    );
    const articles = result.articles as Record<string, unknown>[];

    expect(result.listeId).toBe("list-1");
    expect(result.totalEstimeFcfa).toBe(15000);
    expect(result.nombreArticles).toBe(2);
    expect(articles).toHaveLength(2);
    expect(articles[0]).toEqual({
      ingredient: "Tomate",
      quantite: 3,
      unite: "tas",
      prixEstimeFcfa: 1500,
      lieu: "market",
    });
    expect(mocks.genererListe).toHaveBeenCalledWith(SESSION, "mp-1");
  });

  it("rejette un mealPlanId invalide via le schéma", () => {
    const result = buildShoppingList.schema.safeParse({ mealPlanId: "pas-uuid" });
    expect(result.success).toBe(false);
  });
});

// --- recordMealFeedback ---

describe("recordMealFeedback", () => {
  const REPAS = {
    id: "meal-1",
    mealPlan: { householdId: "h1" },
    recipe: { title: "Sauce graine" },
  };

  it("enregistre un retour positif", async () => {
    mocks.plannedMealFindUnique.mockResolvedValue(REPAS);
    mocks.mealFeedbackCreate.mockResolvedValue({ id: "fb-1" });

    const result = await recordMealFeedback.executer(
      SESSION,
      { plannedMealId: "meal-1", cooked: true, liked: 3, leftovers: false },
      CTX,
    );

    expect(result.feedbackId).toBe("fb-1");
    expect(result.recette).toBe("Sauce graine");
    expect(result.cuisine).toBe(true);
    expect(result.note).toBe(3);
    expect(mocks.mealFeedbackCreate).toHaveBeenCalledWith({
      data: {
        plannedMealId: "meal-1",
        userId: "u1",
        cooked: true,
        liked: 3,
        leftovers: false,
        comment: null,
      },
    });
  });

  it("enregistre un repas non cuisiné", async () => {
    mocks.plannedMealFindUnique.mockResolvedValue(REPAS);
    mocks.mealFeedbackCreate.mockResolvedValue({ id: "fb-2" });

    const result = await recordMealFeedback.executer(
      SESSION,
      { plannedMealId: "meal-1", cooked: false },
      CTX,
    );

    expect(result.cuisine).toBe(false);
    expect(result.note).toBeNull();
    expect(result.message).toContain("pas été cuisiné");
  });

  it("refuse un repas d'un autre foyer", async () => {
    mocks.plannedMealFindUnique.mockResolvedValue({
      ...REPAS,
      mealPlan: { householdId: "autre-foyer" },
    });

    await expect(
      recordMealFeedback.executer(
        SESSION,
        { plannedMealId: "meal-1", cooked: true },
        CTX,
      ),
    ).rejects.toThrow();
  });

  it("refuse un repas introuvable", async () => {
    mocks.plannedMealFindUnique.mockResolvedValue(null);

    await expect(
      recordMealFeedback.executer(
        SESSION,
        { plannedMealId: "meal-1", cooked: true },
        CTX,
      ),
    ).rejects.toThrow();
  });

  it("rejette une note hors limites via le schéma", () => {
    const result = recordMealFeedback.schema.safeParse({
      plannedMealId: "00000000-0000-0000-0000-000000000001",
      cooked: true,
      liked: 5,
    });
    expect(result.success).toBe(false);
  });
});

// --- rememberPreference ---

describe("rememberPreference", () => {
  it("crée une nouvelle préférence", async () => {
    mocks.learnedPreferenceFindFirst.mockResolvedValue(null);
    mocks.learnedPreferenceCreate.mockResolvedValue({
      id: "pref-1",
      key: "aime-poisson",
      value: "La famille aime le poisson grillé",
      confidence: 0.6,
    });

    const result = await rememberPreference.executer(
      SESSION,
      {
        key: "aime-poisson",
        value: "La famille aime le poisson grillé",
        explanation: "Poisson grillé noté 3 deux fois de suite",
      },
      CTX,
    );

    expect(result.preferenceId).toBe("pref-1");
    expect(result.nouvelle).toBe(true);
    expect(result.confiance).toBe(0.6);
    expect(mocks.learnedPreferenceCreate).toHaveBeenCalledWith({
      data: {
        householdId: "h1",
        key: "aime-poisson",
        value: "La famille aime le poisson grillé",
        explanation: "Poisson grillé noté 3 deux fois de suite",
        confidence: 0.6,
        source: "agent",
        active: true,
      },
    });
  });

  it("met à jour une préférence existante avec confiance augmentée", async () => {
    mocks.learnedPreferenceFindFirst.mockResolvedValue({
      id: "pref-old",
      key: "eviter-piment",
      confidence: 0.6,
    });
    mocks.learnedPreferenceUpdate.mockResolvedValue({
      id: "pref-old",
      key: "eviter-piment",
      value: "Éviter les plats très pimentés",
      confidence: 0.8,
    });

    const result = await rememberPreference.executer(
      SESSION,
      {
        key: "eviter-piment",
        value: "Éviter les plats très pimentés",
        explanation: "Retours négatifs sur les plats pimentés",
      },
      CTX,
    );

    expect(result.preferenceId).toBe("pref-old");
    expect(result.nouvelle).toBe(false);
    expect(result.confiance).toBe(0.8);
    expect(mocks.learnedPreferenceUpdate).toHaveBeenCalledWith({
      where: { id: "pref-old" },
      data: {
        value: "Éviter les plats très pimentés",
        explanation: "Retours négatifs sur les plats pimentés",
        confidence: 0.8,
        active: true,
        source: "agent",
      },
    });
  });

  it("plafonne la confiance à 1.0", async () => {
    mocks.learnedPreferenceFindFirst.mockResolvedValue({
      id: "pref-max",
      key: "aime-attieke",
      confidence: 0.9,
    });
    mocks.learnedPreferenceUpdate.mockResolvedValue({
      id: "pref-max",
      key: "aime-attieke",
      value: "Attiéké apprécié",
      confidence: 1.0,
    });

    const result = await rememberPreference.executer(
      SESSION,
      {
        key: "aime-attieke",
        value: "Attiéké apprécié",
        explanation: "Toujours noté 3",
      },
      CTX,
    );

    expect(result.confiance).toBe(1.0);
  });

  it("refuse sans foyer", async () => {
    const sessionSansFoyer: SessionVerifiee = {
      ...SESSION,
      householdId: null,
    };

    await expect(
      rememberPreference.executer(
        sessionSansFoyer,
        {
          key: "test",
          value: "test",
          explanation: "test",
        },
        CTX,
      ),
    ).rejects.toThrow();
  });
});
