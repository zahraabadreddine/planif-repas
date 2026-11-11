import { beforeEach, describe, expect, it, vi } from "vitest";

// Reprendre le chat : la famille retrouve sa dernière conversation en revenant sur la page.

const mocks = vi.hoisted(() => ({
  messageFindFirst: vi.fn(),
  messageFindMany: vi.fn(),
  proposalFindMany: vi.fn(),
  listerMembres: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    message: { findFirst: mocks.messageFindFirst, findMany: mocks.messageFindMany },
    agentProposal: { findMany: mocks.proposalFindMany },
  },
}));
vi.mock("@/lib/foyer/membres", () => ({ listerMembres: mocks.listerMembres }));

import { derniereConversation } from "@/lib/agent/reprise-chat";
import type { SessionVerifiee } from "@/lib/auth/garde";

const SESSION: SessionVerifiee = {
  userId: "u1",
  role: "user",
  householdId: "h1",
  acces: "proprietaire",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.messageFindFirst.mockResolvedValue({ conversationId: "conv-1" });
  // La base renvoie les plus récents d'abord
  mocks.messageFindMany.mockResolvedValue([
    { id: "m2", role: "assistant", content: "Pour Enfant 1, un garba ?" },
    { id: "m1", role: "user", content: "On sera 20 jeudi midi" },
  ]);
  mocks.proposalFindMany.mockResolvedValue([
    {
      id: "p1",
      type: "weekPlan",
      status: "pending",
      payload: { weekStart: "2026-11-09", estimatedCostFcfa: 22000 },
    },
  ]);
  mocks.listerMembres.mockResolvedValue([
    {
      id: "m",
      label: "Zoé",
      ageGroup: "child",
      birthDate: null,
      age: null,
      allergies: [],
      autresAllergies: [],
      regimes: [],
    },
  ]);
});

describe("reprendre la dernière conversation", () => {
  it("seulement celle de la personne connectée, dans son foyer, en mode chat", async () => {
    await derniereConversation(SESSION);
    expect(mocks.messageFindFirst.mock.calls[0][0].where).toEqual({
      conversation: { householdId: "h1", userId: "u1", mode: "chat" },
    });
  });

  it("remet les messages dans l'ordre, avec les surnoms (enregistrés anonymisés)", async () => {
    const reprise = await derniereConversation(SESSION);
    expect(reprise?.messages).toEqual([
      { id: "m1", role: "user", content: "On sera 20 jeudi midi" },
      { id: "m2", role: "assistant", content: "Pour Zoé, un garba ?" },
    ]);
  });

  it("sans les messages des outils, et avec les cartes encore en attente", async () => {
    const reprise = await derniereConversation(SESSION);
    expect(mocks.messageFindMany.mock.calls[0][0].where).toEqual({
      conversationId: "conv-1",
      role: { in: ["user", "assistant"] },
    });
    expect(mocks.proposalFindMany.mock.calls[0][0].where).toMatchObject({
      conversationId: "conv-1",
      status: "pending",
    });
    expect(reprise?.propositions[0]).toMatchObject({ id: "p1", title: "Menu de la semaine" });
  });

  it("aucune conversation : rien à reprendre", async () => {
    mocks.messageFindFirst.mockResolvedValue(null);
    expect(await derniereConversation(SESSION)).toBeNull();
  });
});
