import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  creerProposition: vi.fn(),
  genererMenu: vi.fn(),
  suggestionsUrgence: vi.fn(),
  plannedMealFindUnique: vi.fn(),
  recipeFindUnique: vi.fn(),
  ingredientFindMany: vi.fn(),
  agentProposalUpdateMany: vi.fn(),
}));

vi.mock("@/lib/agent/proposals", () => ({
  creerProposition: mocks.creerProposition,
}));
vi.mock("@/lib/planificateur/generation", () => ({
  genererMenu: mocks.genererMenu,
}));
vi.mock("@/lib/urgence/suggestion", () => ({
  suggestionsUrgence: mocks.suggestionsUrgence,
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    plannedMeal: { findUnique: mocks.plannedMealFindUnique },
    recipe: { findUnique: mocks.recipeFindUnique },
    ingredient: { findMany: mocks.ingredientFindMany },
    agentProposal: { updateMany: mocks.agentProposalUpdateMany },
  },
}));

import { proposeProfileUpdate } from "@/lib/agent/tools/propose-profile-update";
import { generateWeekPlan } from "@/lib/agent/tools/generate-week-plan";
import { proposeMealChange } from "@/lib/agent/tools/propose-meal-change";
import { recordPurchase } from "@/lib/agent/tools/record-purchase";
import { planEmergency } from "@/lib/agent/tools/plan-emergency";
import type { SessionVerifiee } from "@/lib/auth/garde";

const SESSION: SessionVerifiee = {
  userId: "u1",
  role: "user" as const,
  householdId: "h1",
  acces: "proprietaire" as const,
};
const CTX = { conversationId: "conv-1" };
const PROPOSITION = {
  id: "prop-1",
  type: "profileUpdate" as const,
  status: "pending" as const,
  expiresAt: "2026-11-07T12:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.creerProposition.mockResolvedValue(PROPOSITION);
});

// --- proposeProfileUpdate ---

describe("proposeProfileUpdate", () => {
  it("crée une proposition avec les changements fournis", async () => {
    const result = await proposeProfileUpdate.executer(
      SESSION,
      { name: "Famille Koné", weeklyBudgetFcfa: 30000 },
      CTX,
    );

    expect(result.propositionId).toBe("prop-1");
    expect(result.changements).toEqual({ name: "Famille Koné", weeklyBudgetFcfa: 30000 });
    expect(mocks.creerProposition).toHaveBeenCalledWith("conv-1", "profileUpdate", {
      name: "Famille Koné",
      weeklyBudgetFcfa: 30000,
    });
  });

  it("n'inclut que les champs définis", async () => {
    await proposeProfileUpdate.executer(SESSION, { shoppingDay: 6 }, CTX);

    expect(mocks.creerProposition).toHaveBeenCalledWith("conv-1", "profileUpdate", {
      shoppingDay: 6,
    });
  });

  it("rejette le schéma sans aucun champ", () => {
    const result = proposeProfileUpdate.schema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// --- generateWeekPlan ---

describe("generateWeekPlan", () => {
  it("génère un menu et crée une proposition weekPlan", async () => {
    mocks.genererMenu.mockResolvedValue({
      id: "menu-1",
      estimatedCostFcfa: 22000,
      meals: [
        {
          date: "2026-11-09",
          slot: "lunch",
          recipe: { title: "Attiéké poisson", minutes: 30, coutFcfa: 3000 },
        },
      ],
    });
    mocks.creerProposition.mockResolvedValue({ ...PROPOSITION, type: "weekPlan" });

    const result = await generateWeekPlan.executer(SESSION, { weekStart: "2026-11-09" }, CTX);

    expect(result.menuId).toBe("menu-1");
    expect(result.coutEstimeFcfa).toBe(22000);
    expect(result.nombreRepas).toBe(1);
    // Le détail est sur la carte : le modèle ne reçoit pas les repas à recopier
    expect(result).not.toHaveProperty("repas");
    expect(mocks.genererMenu).toHaveBeenCalledWith(SESSION, new Date("2026-11-09T00:00:00Z"));
    const [, , payload] = mocks.creerProposition.mock.calls[0];
    expect(payload.meals[0].recette).toBe("Attiéké poisson");
  });

  it("fait expirer l'ancienne carte de menu du foyer, avant de créer la nouvelle", async () => {
    mocks.genererMenu.mockResolvedValue({ id: "menu-3", estimatedCostFcfa: 21000, meals: [] });
    mocks.creerProposition.mockResolvedValue({ ...PROPOSITION, type: "weekPlan" });

    await generateWeekPlan.executer(SESSION, { weekStart: "2026-11-09" }, CTX);

    expect(mocks.agentProposalUpdateMany).toHaveBeenCalledWith({
      where: { type: "weekPlan", status: "pending", conversation: { householdId: "h1" } },
      data: { status: "expired" },
    });
    expect(mocks.agentProposalUpdateMany.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.creerProposition.mock.invocationCallOrder[0],
    );
  });

  it("utilise le lundi prochain par défaut", async () => {
    mocks.genererMenu.mockResolvedValue({
      id: "menu-2",
      estimatedCostFcfa: 20000,
      meals: [],
    });
    mocks.creerProposition.mockResolvedValue({ ...PROPOSITION, type: "weekPlan" });

    await generateWeekPlan.executer(SESSION, {}, CTX);

    const appel = mocks.genererMenu.mock.calls[0];
    const dateGeneree = appel[1] as Date;
    expect(dateGeneree.getDay()).toBe(1);
  });
});

// --- proposeMealChange ---

describe("proposeMealChange", () => {
  it("crée une proposition de remplacement si repas et recette valides", async () => {
    mocks.plannedMealFindUnique.mockResolvedValue({
      id: "repas-1",
      recipe: { title: "Riz sauce" },
      mealPlan: { householdId: "h1" },
    });
    mocks.recipeFindUnique.mockResolvedValue({
      id: "rec-2",
      title: "Attiéké garba",
      prepMinutes: 10,
      cookMinutes: 15,
      validated: true,
    });
    mocks.creerProposition.mockResolvedValue({ ...PROPOSITION, type: "mealChange" });

    const result = await proposeMealChange.executer(
      SESSION,
      { repasId: "repas-1", recetteId: "rec-2" },
      CTX,
    );

    expect(result.propositionId).toBe("prop-1");
    expect(result.ancien).toBe("Riz sauce");
    expect(result.nouveau).toBe("Attiéké garba");
    expect(result.minutes).toBe(25);
  });

  it("renvoie une erreur si le repas n'appartient pas au foyer", async () => {
    mocks.plannedMealFindUnique.mockResolvedValue({
      id: "repas-1",
      recipe: { title: "Riz" },
      mealPlan: { householdId: "autre-foyer" },
    });
    mocks.recipeFindUnique.mockResolvedValue({
      id: "rec-2",
      title: "Test",
      prepMinutes: 5,
      cookMinutes: 5,
      validated: true,
    });

    const result = await proposeMealChange.executer(
      SESSION,
      { repasId: "repas-1", recetteId: "rec-2" },
      CTX,
    );

    expect(result.erreur).toContain("introuvable");
    expect(mocks.creerProposition).not.toHaveBeenCalled();
  });

  it("renvoie une erreur si la recette n'est pas validée", async () => {
    mocks.plannedMealFindUnique.mockResolvedValue({
      id: "repas-1",
      recipe: { title: "Riz" },
      mealPlan: { householdId: "h1" },
    });
    mocks.recipeFindUnique.mockResolvedValue({
      id: "rec-2",
      title: "Brouillon",
      prepMinutes: 5,
      cookMinutes: 5,
      validated: false,
    });

    const result = await proposeMealChange.executer(
      SESSION,
      { repasId: "repas-1", recetteId: "rec-2" },
      CTX,
    );

    expect(result.erreur).toContain("introuvable ou non validée");
  });
});

// --- recordPurchase ---

describe("recordPurchase", () => {
  it("enrichit les articles avec les noms d'ingrédients et crée une proposition", async () => {
    mocks.ingredientFindMany.mockResolvedValue([
      { id: "ing-1", name: "Tomate" },
      { id: "ing-2", name: "Oignon" },
    ]);
    mocks.creerProposition.mockResolvedValue({ ...PROPOSITION, type: "purchase" });

    const result = await recordPurchase.executer(
      SESSION,
      {
        items: [
          { ingredientId: "ing-1", unitId: "u-1", quantity: 5, location: "fridge" as const },
          { ingredientId: "ing-2", unitId: "u-2", quantity: 3, location: "pantry" as const },
        ],
      },
      CTX,
    );

    expect(result.propositionId).toBe("prop-1");
    const articles = result.articles as Array<{ ingredient: string }>;
    expect(articles).toHaveLength(2);
    expect(articles[0].ingredient).toBe("Tomate");
    expect(articles[1].ingredient).toBe("Oignon");

    const payloadAppel = mocks.creerProposition.mock.calls[0][2];
    expect(payloadAppel.items[0].ingredientNom).toBe("Tomate");
  });

  it("marque Inconnu pour un ingrédient non trouvé", async () => {
    mocks.ingredientFindMany.mockResolvedValue([]);
    mocks.creerProposition.mockResolvedValue({ ...PROPOSITION, type: "purchase" });

    const result = await recordPurchase.executer(
      SESSION,
      {
        items: [{ ingredientId: "ing-x", unitId: "u-1", quantity: 1, location: "fridge" as const }],
      },
      CTX,
    );

    expect((result.articles as Array<{ ingredient: string }>)[0].ingredient).toBe("Inconnu");
  });
});

// --- planEmergency ---

describe("planEmergency", () => {
  it("renvoie des options et crée une proposition si des recettes existent", async () => {
    mocks.suggestionsUrgence.mockResolvedValue([
      {
        id: "r-1",
        title: "Omelette",
        cuisine: "universelle",
        totalMinutes: 10,
        utiliseUseSoon: true,
        difficulty: "facile",
        prepMinutes: 5,
        cookMinutes: 5,
      },
    ]);
    mocks.creerProposition.mockResolvedValue({ ...PROPOSITION, type: "emergency" });

    const result = await planEmergency.executer(SESSION, { maxMinutes: 20 }, CTX);

    expect(result.propositionId).toBe("prop-1");
    const options = result.options as Array<{ titre: string }>;
    expect(options).toHaveLength(1);
    expect(options[0].titre).toBe("Omelette");
    expect(mocks.suggestionsUrgence).toHaveBeenCalledWith(SESSION, 20, undefined);
  });

  it("renvoie un message sans proposition si aucune recette", async () => {
    mocks.suggestionsUrgence.mockResolvedValue([]);

    const result = await planEmergency.executer(SESSION, { maxMinutes: 5 }, CTX);

    expect(result.options).toHaveLength(0);
    expect(result.message).toContain("Aucune recette");
    expect(mocks.creerProposition).not.toHaveBeenCalled();
  });

  it("passe nbPersonnes à suggestionsUrgence", async () => {
    mocks.suggestionsUrgence.mockResolvedValue([]);

    await planEmergency.executer(SESSION, { maxMinutes: 30, nbPersonnes: 6 }, CTX);

    expect(mocks.suggestionsUrgence).toHaveBeenCalledWith(SESSION, 30, 6);
  });
});
