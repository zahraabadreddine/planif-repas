import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Corrections de l'audit : l'urgence et Umi regardent la bonne semaine, une semaine terminée ne
// se modifie plus côté serveur, et le chat refuse un envoi trop lourd sans le garder en mémoire.

const mocks = vi.hoisted(() => ({
  mealPlanFindFirst: vi.fn(),
  lireMenuCourant: vi.fn(),
  lireMenuDeLaSemaine: vi.fn(),
  exigerEcriture: vi.fn(),
  orchestrerStream: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    mealPlan: { findFirst: mocks.mealPlanFindFirst },
    agentProposal: { findMany: async () => [] },
  },
}));
vi.mock("@/lib/planificateur/generation", async (original) => ({
  ...(await original<object>()),
  lireMenuCourant: mocks.lireMenuCourant,
  lireMenuDeLaSemaine: mocks.lireMenuDeLaSemaine,
}));
vi.mock("@/lib/auth/garde", () => ({ exigerEcriture: mocks.exigerEcriture }));
vi.mock("@/lib/agent/orchestrateur", () => ({ orchestrerStream: mocks.orchestrerStream }));

import { reorganiserUrgence, semaineTerminee } from "@/lib/planificateur/modification";
import { getWeekPlan } from "@/lib/agent/tools/get-week-plan";
import { POST as envoyerMessage } from "@/app/api/chat/messages/route";
import type { SessionVerifiee } from "@/lib/auth/garde";

const SESSION = {
  userId: "u1",
  role: "user",
  householdId: "h1",
  acces: "proprietaire",
} as SessionVerifiee;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  // Dimanche 15 novembre 2026, 20 h à Abidjan : la semaine en cours est celle du lundi 9
  vi.setSystemTime(new Date("2026-11-15T20:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("l'urgence de ce soir prend le menu de cette semaine", () => {
  it("cherche le menu validé du lundi en cours, pas le plus récent", async () => {
    mocks.mealPlanFindFirst.mockResolvedValue(null);
    await expect(reorganiserUrgence(SESSION, "recette-rapide", "dinner")).rejects.toThrow(
      "Aucun menu validé cette semaine",
    );
    const recherche = mocks.mealPlanFindFirst.mock.calls[0][0];
    expect(recherche.where).toEqual({
      householdId: "h1",
      status: "active",
      weekStart: new Date("2026-11-09T00:00:00Z"),
    });
    // Plus de tri « le plus récent d'abord » : la semaine prochaine ne passe jamais devant
    expect(recherche.orderBy).toBeUndefined();
  });
});

describe("une semaine terminée ne se modifie plus", () => {
  const lundi = (jour: string) => new Date(`${jour}T00:00:00Z`);

  it("la semaine d'avant est terminée ; celle-ci et la prochaine non", () => {
    expect(semaineTerminee(lundi("2026-11-02"))).toBe(true);
    expect(semaineTerminee(lundi("2026-11-09"))).toBe(false);
    expect(semaineTerminee(lundi("2026-11-16"))).toBe(false);
  });
});

describe("Umi lit le menu de la semaine demandée", () => {
  it("un jour de la semaine prochaine donne le menu de son lundi", async () => {
    mocks.lireMenuDeLaSemaine.mockResolvedValue({ id: "menu-prochain" });
    const resultat = await getWeekPlan.executer(
      SESSION,
      { weekStart: "2026-11-18" },
      {
        conversationId: "c1",
      },
    );
    expect(mocks.lireMenuDeLaSemaine).toHaveBeenCalledWith(SESSION, "2026-11-16");
    expect(resultat).toEqual({ menu: { id: "menu-prochain" } });
    expect(mocks.lireMenuCourant).not.toHaveBeenCalled();
  });

  it("une semaine sans menu le dit, avec ses dates", async () => {
    mocks.lireMenuDeLaSemaine.mockResolvedValue(null);
    const resultat = await getWeekPlan.executer(
      SESSION,
      { weekStart: "2026-11-23" },
      {
        conversationId: "c1",
      },
    );
    expect(resultat).toEqual({ menu: null, message: "Aucun menu pour la semaine du 23 → 29 nov." });
  });

  it("sans date : la semaine en cours, comme avant", async () => {
    mocks.lireMenuCourant.mockResolvedValue({ id: "menu-en-cours" });
    expect(await getWeekPlan.executer(SESSION, {}, { conversationId: "c1" })).toEqual({
      menu: { id: "menu-en-cours" },
    });
  });

  it("une fausse date est refusée avant toute lecture", () => {
    expect(getWeekPlan.schema.safeParse({ weekStart: "2026-02-31" }).success).toBe(false);
  });
});

describe("le chat refuse un envoi trop lourd", () => {
  /** Lit les événements SSE renvoyés par la route. */
  async function evenements(reponse: Response): Promise<string> {
    return await reponse.text();
  }

  it("un corps de 5 Mo est refusé sans appeler Umi", async () => {
    mocks.exigerEcriture.mockResolvedValue(SESSION);
    const enorme = JSON.stringify({ message: "x".repeat(5_000_000) });
    const reponse = await envoyerMessage(
      new Request("http://localhost/api/chat/messages", { method: "POST", body: enorme }) as never,
    );
    expect(await evenements(reponse)).toContain("trop lourd");
    expect(mocks.orchestrerStream).not.toHaveBeenCalled();
  });

  it("un message normal passe toujours", async () => {
    mocks.exigerEcriture.mockResolvedValue(SESSION);
    mocks.orchestrerStream.mockResolvedValue(undefined);
    await (
      await envoyerMessage(
        new Request("http://localhost/api/chat/messages", {
          method: "POST",
          body: JSON.stringify({ message: "Bonjour Umi" }),
        }) as never,
      )
    ).text();
    expect(mocks.orchestrerStream).toHaveBeenCalledTimes(1);
    expect(mocks.orchestrerStream.mock.calls[0][2]).toBe("Bonjour Umi");
  });
});
