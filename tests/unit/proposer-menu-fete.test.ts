import { beforeEach, describe, expect, it, vi } from "vitest";

// Règle 1 : le menu de fête d'Umi est une proposition que la famille confirme.

const mocks = vi.hoisted(() => ({ composerFete: vi.fn(), creerProposition: vi.fn() }));
vi.mock("@/lib/planificateur/fete", () => ({ composerFete: mocks.composerFete }));
vi.mock("@/lib/agent/proposals", () => ({ creerProposition: mocks.creerProposition }));

import { proposerMenuFete } from "@/lib/agent/tools/proposer-menu-fete";
import type { SessionVerifiee } from "@/lib/auth/garde";

const SESSION: SessionVerifiee = {
  userId: "u1",
  role: "user",
  householdId: "h1",
  acces: "proprietaire",
};
const demande = {
  date: "2026-11-12",
  creneau: "lunch" as const,
  personnes: 20,
  budgetFcfa: 100000,
  plats: [{ recetteId: "a1a1a1a1-b2b2-4c3c-8d4d-e5e5e5e5e5e5", categorie: "entrée" as const }],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.creerProposition.mockResolvedValue({ id: "prop-1", type: "mealChange", status: "pending" });
});

describe("proposerMenuFete", () => {
  it("chiffre le menu par le code et en fait une proposition à confirmer", async () => {
    const fete = { ...demande, plats: [], totalFcfa: 60000, depassementFcfa: 0, sansPrix: [] };
    mocks.composerFete.mockResolvedValue(fete);
    const afficher = vi.fn();
    const resultat = await proposerMenuFete.executer(SESSION, demande, {
      conversationId: "c1",
      afficher,
    });
    expect(mocks.creerProposition).toHaveBeenCalledWith("c1", "mealChange", { fete });
    expect(afficher).not.toHaveBeenCalled();
    expect(resultat).toMatchObject({ propositionId: "prop-1", dansLeBudget: true });
  });

  it("dit quand le menu dépasse le budget", async () => {
    mocks.composerFete.mockResolvedValue({
      ...demande,
      plats: [],
      totalFcfa: 120000,
      depassementFcfa: 20000,
      sansPrix: [],
    });
    const resultat = await proposerMenuFete.executer(SESSION, demande, { conversationId: "c1" });
    expect(resultat).toMatchObject({ dansLeBudget: false, depassementFcfa: 20000 });
  });
});
