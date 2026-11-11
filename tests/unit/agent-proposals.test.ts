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
  changerPortions: vi.fn(),
  reorganiserUrgence: vi.fn(),
  declarerAchats: vi.fn(),
}));

const fete = vi.hoisted(() => ({ appliquerFete: vi.fn() }));
vi.mock("@/lib/planificateur/fete", () => ({ appliquerFete: fete.appliquerFete }));
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
  changerPortions: mocks.changerPortions,
  reorganiserUrgence: mocks.reorganiserUrgence,
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

  it.each([
    ["accepted", "déjà été confirmée"],
    ["rejected", "déjà été refusée"],
    ["expired", "remplacée par une plus récente"],
  ])("refuse une proposition %s avec un message clair", async (status, message) => {
    mocks.agentProposalFindUnique.mockResolvedValue({
      id: "prop-1",
      type: "weekPlan",
      status,
      expiresAt: futur,
      payload: {},
      conversation: { householdId: "h1" },
    });
    await expect(chargerProposition(SESSION, "prop-1")).rejects.toThrow(message);
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

  it("refuse un profil proposé par l'agent qui ne respecte pas les règles du foyer", async () => {
    mockProposition("profileUpdate", { weeklyBudgetFcfa: 1 });
    mocks.lireFoyer.mockResolvedValue({
      name: "Famille Koné",
      weeklyBudgetFcfa: 25000,
      cuisinesPreferred: [],
      shoppingDay: null,
    });
    await expect(accepterProposition(SESSION, "prop-1")).rejects.toMatchObject({
      code: "DONNEESINVALIDES",
    });
    expect(mocks.enregistrerFoyer).not.toHaveBeenCalled();
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

  it("applique mealChange avec des portions : la semaine est recalculée et revérifiée", async () => {
    const repasId = "c2c2c2c2-d3d3-4e4e-8f5f-a0a0a0a0a0a0";
    const menuId = "a0a0a0a0-b1b1-4c2c-8d3d-e4e4e4e4e4e4";
    mockProposition("mealChange", { repasId, portions: 12, anciennesPortions: 4 });
    mocks.changerPortions.mockResolvedValue({ menu: { id: menuId } });

    const result = await accepterProposition(SESSION, "prop-1");

    expect(result.resultat).toEqual({ menuId });
    expect(mocks.changerPortions).toHaveBeenCalledWith(SESSION, repasId, 12);
    expect(mocks.remplacerRepas).not.toHaveBeenCalled();
  });

  it("refuse une proposition de repas qui change à la fois la recette et les portions", async () => {
    mockProposition("mealChange", {
      repasId: "c2c2c2c2-d3d3-4e4e-8f5f-a0a0a0a0a0a0",
      nouvelleRecetteId: "d3d3d3d3-e4e4-4f5f-8a0a-b1b1b1b1b1b1",
      portions: 30,
    });
    await expect(accepterProposition(SESSION, "prop-1")).rejects.toThrow("invalide");
    expect(mocks.changerPortions).not.toHaveBeenCalled();
    expect(mocks.remplacerRepas).not.toHaveBeenCalled();
  });

  // La carte enregistrée par l'outil : chaque plat porte aussi son titre et son coût (MenuFete)
  const carteFete = (depassementFcfa = 0) => ({
    fete: {
      date: "2026-11-12",
      creneau: "lunch",
      personnes: 20,
      budgetFcfa: 100000,
      plats: [
        {
          recetteId: "a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e5e5",
          titre: "Houmous",
          categorie: "entrée",
          coutFcfa: 33336,
        },
      ],
      totalFcfa: 33336 + depassementFcfa,
      depassementFcfa,
      sansPrix: [],
    },
  });
  const demandeFete = {
    date: "2026-11-12",
    creneau: "lunch",
    personnes: 20,
    budgetFcfa: 100000,
    plats: [{ recetteId: "a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e5e5", categorie: "entrée" }],
  };

  it("applique la carte de fête telle qu'Umi l'enregistre : seule la demande compte, le code revérifie", async () => {
    mockProposition("mealChange", carteFete());
    fete.appliquerFete.mockResolvedValue({ menuId: "menu-1", plats: 1 });

    const result = await accepterProposition(SESSION, "prop-1");

    expect(fete.appliquerFete).toHaveBeenCalledWith(SESSION, demandeFete, false);
    expect(result.resultat).toEqual({ menuId: "menu-1", plats: 1 });
    expect(mocks.remplacerRepas).not.toHaveBeenCalled();
  });

  it("transmet l'accord de la famille pour un menu de fête hors budget", async () => {
    mockProposition("mealChange", carteFete(11850));
    fete.appliquerFete.mockResolvedValue({ menuId: "menu-1", plats: 1 });

    await accepterProposition(SESSION, "prop-1", { depassementAccepte: true });

    expect(fete.appliquerFete).toHaveBeenCalledWith(SESSION, demandeFete, true);
  });

  it("refuse un menu de fête mal formé, sans rien appliquer", async () => {
    mockProposition("mealChange", { fete: { date: "pas une date", plats: [] } });
    await expect(accepterProposition(SESSION, "prop-1")).rejects.toThrow("invalide");
    expect(fete.appliquerFete).not.toHaveBeenCalled();
  });

  it("applique purchase : déclare les achats", async () => {
    const ingId = "e4e4e4e4-f5f5-4a0a-8b1b-c2c2c2c2c2c2";
    const unitId = "f5f5f5f5-a0a0-4b1b-8c2c-d3d3d3d3d3d3";
    mockProposition("purchase", {
      items: [{ ingredientId: ingId, unitId, quantity: 3, location: "fridge" }],
    });
    mocks.declarerAchats.mockResolvedValue([{ id: "sm-1" }]);

    const result = await accepterProposition(SESSION, "prop-1");

    expect(result.status).toBe("accepted");
    expect(result.resultat).toEqual({ articles: 1 });
    expect(mocks.declarerAchats).toHaveBeenCalledWith(SESSION, [
      { ingredientId: ingId, unitId, quantity: 3, location: "fridge" },
    ]);
  });

  it("applique emergency : plat rapide ce soir, le dîner prévu glisse au lendemain", async () => {
    mockProposition("emergency", {
      options: [
        { recetteId: "r-1", titre: "Attiéké poisson" },
        { recetteId: "r-2", titre: "Riz sauce" },
      ],
    });
    mocks.reorganiserUrgence.mockResolvedValue({
      menu: { id: "plan-1" },
      liste: { id: "liste-1" },
      ancienneRecette: "Foutou banane",
      decale: true,
      message: "« Foutou banane » est décalé à demain soir.",
    });

    const result = await accepterProposition(SESSION, "prop-1");

    expect(result.status).toBe("accepted");
    expect(result.resultat).toMatchObject({
      ancienneRecette: "Foutou banane",
      nouvelleRecette: "Attiéké poisson",
      decale: true,
    });
    // Une proposition sans créneau (avant cette version) reste un dîner
    expect(mocks.reorganiserUrgence).toHaveBeenCalledWith(SESSION, "r-1", "dinner");
    expect(mocks.remplacerRepas).not.toHaveBeenCalled();
  });

  it("refuse un type inconnu", async () => {
    mockProposition("inconnu" as never, {});
    await expect(accepterProposition(SESSION, "prop-1")).rejects.toThrow("inconnu");
  });
});

describe("accepterProposition : double clic sur « Confirmer »", () => {
  const MENU = "8f2b4c1e-3d5a-4e6f-9a7b-1c2d3e4f5a6b";

  function enAttente() {
    mocks.agentProposalFindUnique.mockResolvedValue({
      id: "prop-1",
      type: "weekPlan",
      status: "pending",
      expiresAt: futur,
      payload: { menuId: MENU },
      conversation: { householdId: "h1" },
    });
  }

  it("réserve la proposition avant de l'appliquer", async () => {
    enAttente();
    mocks.agentProposalUpdateMany.mockResolvedValue({ count: 1 });
    mocks.activerMenu.mockImplementation(async () => {
      // Au moment d'appliquer, la proposition est déjà marquée acceptée
      expect(mocks.agentProposalUpdateMany).toHaveBeenCalledWith({
        where: { id: "prop-1", status: "pending" },
        data: { status: "accepted" },
      });
      return { menu: { id: MENU }, liste: { id: "liste-1" } };
    });
    await expect(accepterProposition(SESSION, "prop-1")).resolves.toMatchObject({
      status: "accepted",
    });
  });

  it("un second clic arrivé en même temps n'applique rien", async () => {
    enAttente();
    // L'autre clic a déjà réservé la proposition
    mocks.agentProposalUpdateMany.mockResolvedValue({ count: 0 });
    await expect(accepterProposition(SESSION, "prop-1")).rejects.toMatchObject({
      code: "DONNEESINVALIDES",
    });
    expect(mocks.activerMenu).not.toHaveBeenCalled();
  });

  it("remet la proposition en attente si l'application échoue", async () => {
    enAttente();
    mocks.agentProposalUpdateMany.mockResolvedValue({ count: 1 });
    mocks.activerMenu.mockRejectedValue(new Error("allergie"));
    await expect(accepterProposition(SESSION, "prop-1")).rejects.toThrow("allergie");
    expect(mocks.agentProposalUpdateMany).toHaveBeenLastCalledWith({
      where: { id: "prop-1", status: "accepted" },
      data: { status: "pending" },
    });
  });

  it("un contenu invalide est refusé sans toucher au statut", async () => {
    mocks.agentProposalFindUnique.mockResolvedValue({
      id: "prop-1",
      type: "weekPlan",
      status: "pending",
      expiresAt: futur,
      payload: { menuId: "pas-un-uuid" },
      conversation: { householdId: "h1" },
    });
    await expect(accepterProposition(SESSION, "prop-1")).rejects.toMatchObject({
      code: "DONNEESINVALIDES",
    });
    expect(mocks.agentProposalUpdateMany).not.toHaveBeenCalled();
  });
});

describe("accepterProposition : la famille choisit son plat d'urgence", () => {
  function urgence() {
    mocks.agentProposalFindUnique.mockResolvedValue({
      id: "prop-1",
      type: "emergency",
      status: "pending",
      expiresAt: futur,
      payload: {
        options: [
          { recetteId: "r-1", titre: "Attiéké poisson" },
          { recetteId: "r-2", titre: "Alloco et œufs" },
        ],
      },
      conversation: { householdId: "h1" },
    });
    mocks.agentProposalUpdateMany.mockResolvedValue({ count: 1 });
    mocks.reorganiserUrgence.mockResolvedValue({
      menu: { id: "plan-1" },
      liste: null,
      ancienneRecette: "Foutou banane",
      decale: true,
      message: "« Foutou banane » est décalé à demain soir.",
    });
  }

  it("une proposition faite le midi remplace le déjeuner, même confirmée plus tard", async () => {
    urgence();
    const proposition = await mocks.agentProposalFindUnique();
    mocks.agentProposalFindUnique.mockResolvedValue({
      ...proposition,
      payload: { ...proposition.payload, creneau: "lunch" },
    });
    const result = await accepterProposition(SESSION, "prop-1");
    expect(mocks.reorganiserUrgence).toHaveBeenCalledWith(SESSION, "r-1", "lunch");
    expect(String(result.resultat.message)).toMatch(/^Attiéké poisson ce midi./);
  });

  it("applique l'option choisie, pas la première", async () => {
    urgence();
    const result = await accepterProposition(SESSION, "prop-1", { recetteId: "r-2" });
    expect(mocks.reorganiserUrgence).toHaveBeenCalledWith(SESSION, "r-2", "dinner");
    expect(result.resultat.nouvelleRecette).toBe("Alloco et œufs");
  });

  it("refuse un plat qui ne fait pas partie des options, sans rien appliquer", async () => {
    urgence();
    await expect(
      accepterProposition(SESSION, "prop-1", { recetteId: "plat-inconnu" }),
    ).rejects.toMatchObject({ code: "DONNEESINVALIDES" });
    expect(mocks.reorganiserUrgence).not.toHaveBeenCalled();
    expect(mocks.agentProposalUpdateMany).not.toHaveBeenCalled();
  });
});
