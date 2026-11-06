import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  agentProposalCreate: vi.fn(),
  agentProposalFindUnique: vi.fn(),
  agentProposalUpdate: vi.fn(),
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
    mocks.agentProposalUpdate.mockResolvedValue({});

    const result = await rejeterProposition(SESSION, "prop-1");

    expect(result).toEqual({ id: "prop-1", status: "rejected" });
    expect(mocks.agentProposalUpdate).toHaveBeenCalledWith({
      where: { id: "prop-1" },
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
    mocks.agentProposalUpdate.mockResolvedValue({});
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
    mockProposition("weekPlan", { menuId: "menu-1" });
    mocks.activerMenu.mockResolvedValue({
      menu: { id: "menu-1" },
      liste: { id: "liste-1" },
    });

    const result = await accepterProposition(SESSION, "prop-1");

    expect(result.status).toBe("accepted");
    expect(result.resultat).toEqual({ menuId: "menu-1", listeId: "liste-1" });
    expect(mocks.activerMenu).toHaveBeenCalledWith(SESSION, "menu-1");
  });

  it("applique mealChange : remplace le repas", async () => {
    mockProposition("mealChange", { repasId: "repas-1", nouvelleRecetteId: "rec-2" });
    mocks.remplacerRepas.mockResolvedValue({ menu: { id: "menu-1" } });

    const result = await accepterProposition(SESSION, "prop-1");

    expect(result.status).toBe("accepted");
    expect(result.resultat).toEqual({ menuId: "menu-1" });
    expect(mocks.remplacerRepas).toHaveBeenCalledWith(SESSION, "repas-1", "rec-2");
  });

  it("applique purchase : déclare les achats", async () => {
    mockProposition("purchase", {
      items: [
        { ingredientId: "ing-1", unitId: "u-1", quantity: 3, location: "fridge" },
      ],
    });
    mocks.declarerAchats.mockResolvedValue([{ id: "sm-1" }]);

    const result = await accepterProposition(SESSION, "prop-1");

    expect(result.status).toBe("accepted");
    expect(result.resultat).toEqual({ articles: 1 });
    expect(mocks.declarerAchats).toHaveBeenCalledWith(SESSION, [
      { ingredientId: "ing-1", unitId: "u-1", quantity: 3, location: "fridge" },
    ]);
  });

  it("applique emergency : renvoie les options", async () => {
    mockProposition("emergency", {
      options: [
        { recetteId: "r-1", titre: "Attiéké poisson" },
        { recetteId: "r-2", titre: "Riz sauce" },
      ],
    });

    const result = await accepterProposition(SESSION, "prop-1");

    expect(result.status).toBe("accepted");
    expect(result.resultat.options).toEqual(["Attiéké poisson", "Riz sauce"]);
  });

  it("refuse un type inconnu", async () => {
    mockProposition("inconnu" as never, {});
    await expect(accepterProposition(SESSION, "prop-1")).rejects.toThrow("inconnu");
  });
});
