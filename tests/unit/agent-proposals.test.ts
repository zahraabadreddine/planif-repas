import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  agentProposalCreate: vi.fn(),
  agentProposalFindUnique: vi.fn(),
  agentProposalUpdate: vi.fn(),
  agentProposalUpdateMany: vi.fn(),
  mealPlanFindFirst: vi.fn(),
  lireFoyer: vi.fn(),
  enregistrerFoyer: vi.fn(),
  activerMenu: vi.fn(),
  remplacerRepas: vi.fn(),
  declarerAchats: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    agentProposal: {
      create: mocks.agentProposalCreate,
      findUnique: mocks.agentProposalFindUnique,
      update: mocks.agentProposalUpdate,
      updateMany: mocks.agentProposalUpdateMany,
    },
    mealPlan: {
      findFirst: mocks.mealPlanFindFirst,
    },
  },
}));

vi.mock("@/lib/foyer/profil", () => ({
  lireFoyer: mocks.lireFoyer,
  enregistrerFoyer: mocks.enregistrerFoyer,
}));
vi.mock("@/lib/planificateur/generation", () => ({
  activerMenu: mocks.activerMenu,
}));
vi.mock("@/lib/planificateur/modification", () => ({
  remplacerRepas: mocks.remplacerRepas,
}));
vi.mock("@/lib/stock/achats", () => ({
  declarerAchats: mocks.declarerAchats,
}));

import {
  creerProposition,
  chargerProposition,
  rejeterProposition,
  accepterProposition,
} from "@/lib/agent/proposals";
import type { SessionVerifiee } from "@/lib/auth/garde";

const SESSION: SessionVerifiee = {
  userId: "u1",
  role: "user" as const,
  householdId: "h1",
  acces: "proprietaire" as const,
};

const futur = new Date(Date.now() + 48 * 3600 * 1000);
const passe = new Date(Date.now() - 1000);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("creerProposition", () => {
  it("crée une proposition pending avec expiration à +24h", async () => {
    mocks.agentProposalCreate.mockResolvedValue({
      id: "prop-1",
      type: "profileUpdate",
      status: "pending",
      expiresAt: futur,
    });

    const result = await creerProposition("conv-1", "profileUpdate", { name: "Famille Test" });

    expect(result.id).toBe("prop-1");
    expect(result.type).toBe("profileUpdate");
    expect(result.status).toBe("pending");
    expect(result.expiresAt).toBe(futur.toISOString());
    expect(mocks.agentProposalCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: "conv-1",
        type: "profileUpdate",
        payload: { name: "Famille Test" },
      }),
    });
  });
});

describe("chargerProposition", () => {
  it("charge une proposition pending du foyer", async () => {
    mocks.agentProposalFindUnique.mockResolvedValue({
      id: "prop-1",
      type: "profileUpdate",
      status: "pending",
      expiresAt: futur,
      payload: { name: "Test" },
      conversation: { householdId: "h1" },
    });

    const result = await chargerProposition(SESSION, "prop-1");
    expect(result.id).toBe("prop-1");
  });

  it("refuse si la proposition n'existe pas", async () => {
    mocks.agentProposalFindUnique.mockResolvedValue(null);
    await expect(chargerProposition(SESSION, "inexistant")).rejects.toThrow("introuvable");
  });

  it("refuse si le foyer ne correspond pas", async () => {
    mocks.agentProposalFindUnique.mockResolvedValue({
      id: "prop-1",
      type: "profileUpdate",
      status: "pending",
      expiresAt: futur,
      payload: {},
      conversation: { householdId: "autre-foyer" },
    });
    await expect(chargerProposition(SESSION, "prop-1")).rejects.toThrow("introuvable");
  });

  it("refuse si la proposition est déjà traitée", async () => {
    mocks.agentProposalFindUnique.mockResolvedValue({
      id: "prop-1",
      type: "profileUpdate",
      status: "accepted",
      expiresAt: futur,
      payload: {},
      conversation: { householdId: "h1" },
    });
    await expect(chargerProposition(SESSION, "prop-1")).rejects.toThrow("déjà été traitée");
  });

  it("marque expirée et refuse si la proposition a expiré", async () => {
    mocks.agentProposalFindUnique.mockResolvedValue({
      id: "prop-1",
      type: "profileUpdate",
      status: "pending",
      expiresAt: passe,
      payload: {},
      conversation: { householdId: "h1" },
    });

    await expect(chargerProposition(SESSION, "prop-1")).rejects.toThrow("expiré");
    expect(mocks.agentProposalUpdate).toHaveBeenCalledWith({
      where: { id: "prop-1" },
      data: { status: "expired" },
    });
  });

  it("refuse sans foyer dans la session", async () => {
    const sansfoyer = { ...SESSION, householdId: null };
    await expect(chargerProposition(sansfoyer, "prop-1")).rejects.toThrow("foyer");
  });
});

describe("rejeterProposition", () => {
  it("passe le statut à rejected", async () => {
    mocks.agentProposalFindUnique.mockResolvedValue({
      id: "prop-1",
      type: "profileUpdate",
      status: "pending",
      expiresAt: futur,
      payload: {},
      conversation: { householdId: "h1" },
    });
    mocks.agentProposalUpdateMany.mockResolvedValue({ count: 1 });

    const result = await rejeterProposition(SESSION, "prop-1");

    expect(result).toEqual({ id: "prop-1", status: "rejected" });
    expect(mocks.agentProposalUpdateMany).toHaveBeenCalledWith({
      where: { id: "prop-1", status: "pending" },
      data: { status: "rejected" },
    });
  });
});

describe("accepterProposition", () => {
  function mockProposition(type: string, payload: Record<string, unknown>) {
    mocks.agentProposalFindUnique.mockResolvedValue({
      id: "prop-1",
      type,
      status: "pending",
      expiresAt: futur,
      payload,
      conversation: { householdId: "h1" },
    });
    mocks.agentProposalUpdateMany.mockResolvedValue({ count: 1 });
  }

  it("applique profileUpdate : fusionne avec le foyer existant", async () => {
    mockProposition("profileUpdate", { name: "Nouveau nom" });
    mocks.lireFoyer.mockResolvedValue({
      name: "Ancien",
      weeklyBudgetFcfa: 25000,
      cuisinesPreferred: ["ivoirienne"],
      shoppingDay: null,
    });
    mocks.enregistrerFoyer.mockResolvedValue({ foyer: { id: "h1", name: "Nouveau nom" } });

    const result = await accepterProposition(SESSION, "prop-1");

    expect(result.status).toBe("accepted");
    expect(mocks.enregistrerFoyer).toHaveBeenCalledWith(SESSION, {
      name: "Nouveau nom",
      weeklyBudgetFcfa: 25000,
      cuisinesPreferred: ["ivoirienne"],
      shoppingDay: null,
    });
  });

  it("applique weekPlan : active le menu", async () => {
    const menuId = "a0a0a0a0-b1b1-4c2c-8d3d-e4e4e4e4e4e4";
    const listeId = "b1b1b1b1-c2c2-4d3d-8e4e-f5f5f5f5f5f5";
    mockProposition("weekPlan", { menuId });
    mocks.activerMenu.mockResolvedValue({
      menu: { id: menuId },
      liste: { id: listeId },
    });

    const result = await accepterProposition(SESSION, "prop-1");

    expect(result.status).toBe("accepted");
    expect(result.resultat).toEqual({ menuId, listeId });
    expect(mocks.activerMenu).toHaveBeenCalledWith(SESSION, menuId);
  });

  it("applique mealChange : remplace le repas", async () => {
    const repasId = "c2c2c2c2-d3d3-4e4e-8f5f-a0a0a0a0a0a0";
    const recetteId = "d3d3d3d3-e4e4-4f5f-8a0a-b1b1b1b1b1b1";
    const menuId = "a0a0a0a0-b1b1-4c2c-8d3d-e4e4e4e4e4e4";
    mockProposition("mealChange", { repasId, nouvelleRecetteId: recetteId });
    mocks.remplacerRepas.mockResolvedValue({ menu: { id: menuId } });

    const result = await accepterProposition(SESSION, "prop-1");

    expect(result.status).toBe("accepted");
    expect(result.resultat).toEqual({ menuId });
    expect(mocks.remplacerRepas).toHaveBeenCalledWith(SESSION, repasId, recetteId);
  });

  it("applique purchase : déclare les achats", async () => {
    const ingId = "e4e4e4e4-f5f5-4a0a-8b1b-c2c2c2c2c2c2";
    const unitId = "f5f5f5f5-a0a0-4b1b-8c2c-d3d3d3d3d3d3";
    mockProposition("purchase", {
      items: [
        { ingredientId: ingId, unitId, quantity: 3, location: "fridge" },
      ],
    });
    mocks.declarerAchats.mockResolvedValue([{ id: "sm-1" }]);

    const result = await accepterProposition(SESSION, "prop-1");

    expect(result.status).toBe("accepted");
    expect(result.resultat).toEqual({ articles: 1 });
    expect(mocks.declarerAchats).toHaveBeenCalledWith(SESSION, [
      { ingredientId: ingId, unitId, quantity: 3, location: "fridge" },
    ]);
  });

  it("applique emergency : remplace le dîner du soir", async () => {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);

    mockProposition("emergency", {
      options: [
        { recetteId: "r-1", titre: "Attiéké poisson" },
        { recetteId: "r-2", titre: "Riz sauce" },
      ],
    });

    mocks.mealPlanFindFirst.mockResolvedValue({
      id: "plan-1",
      meals: [
        {
          id: "meal-1",
          slot: "dinner",
          status: "planned",
          date: aujourdhui,
          recipe: { id: "old-r", title: "Foutou banane" },
        },
      ],
    });

    mocks.remplacerRepas.mockResolvedValue({
      menu: { id: "plan-1" },
      liste: { id: "liste-1" },
    });

    const result = await accepterProposition(SESSION, "prop-1");

    expect(result.status).toBe("accepted");
    expect(result.resultat.ancienneRecette).toBe("Foutou banane");
    expect(result.resultat.nouvelleRecette).toBe("Attiéké poisson");
    expect(mocks.remplacerRepas).toHaveBeenCalledWith(SESSION, "meal-1", "r-1");
  });

  it("refuse un type inconnu", async () => {
    mockProposition("inconnu" as never, {});
    await expect(accepterProposition(SESSION, "prop-1")).rejects.toThrow("inconnu");
  });
});
