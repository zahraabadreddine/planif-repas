import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const { prisma, exigerEcriture, chargerRecettes, listerMembres, genererListe } = vi.hoisted(() => {
  const prisma = {
    household: { findUnique: vi.fn() },
    stockItem: { findMany: vi.fn() },
    plannedMeal: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    dishRating: { findMany: vi.fn() },
    mealPlan: { findFirst: vi.fn(), update: vi.fn() },
    $transaction: (arg: unknown): unknown =>
      Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(prisma),
  };
  return {
    prisma,
    exigerEcriture: vi.fn(),
    chargerRecettes: vi.fn(),
    listerMembres: vi.fn(),
    genererListe: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth/garde", () => ({ exigerSession: vi.fn(), exigerEcriture }));
vi.mock("@/lib/catalogue/recettes", () => ({ chargerRecettes, lignesPourCout: () => [] }));
// 300 FCFA par portion pour toutes les recettes
vi.mock("@/lib/catalogue/cout", () => ({ coutRecette: () => ({ parPersonneFcfa: 300 }) }));
vi.mock("@/lib/foyer/membres", () => ({ listerMembres }));
vi.mock("@/lib/courses/generation", () => ({ genererListe }));

import { PATCH as remplacer } from "@/app/api/planned-meals/[id]/route";

const SESSION = { userId: "u1", role: "user", householdId: "f1" };
const PLAN = "8f2b4c1e-3d5a-4e6f-9a7b-1c2d3e4f5a6b";
const LUNDI = "2026-10-26";

const pad = (n: number) => String(n).padStart(12, "0");
const idRecette = (n: number) => `10000000-0000-4000-8000-${pad(n)}`;
const idRepas = (jour: number, slot: "lunch" | "dinner") =>
  `20000000-0000-4000-8000-${pad(jour * 2 + (slot === "dinner" ? 2 : 1))}`;

const LUNDI_MIDI = idRepas(0, "lunch");
const LUNDI_SOIR = idRepas(0, "dinner");
const MARDI_MIDI = idRepas(1, "lunch");

const contexte = (id: string) => ({ params: Promise.resolve({ id }) });
const requete = (corps: unknown) =>
  new Request("http://localhost/api/planned-meals/x", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corps),
  });

type Options = { arachide?: boolean; four?: boolean; mealTypes?: string[] };

function recette(n: number, options: Options = {}) {
  return {
    id: idRecette(n),
    title: `Plat ${n}`,
    cuisine: "ivoirienne",
    mealTypes: options.mealTypes ?? ["lunch", "dinner"],
    prepMinutes: 10,
    cookMinutes: 20,
    servings: 4,
    tags: options.four ? ["four"] : [],
    ingredients: [
      {
        quantity: 500,
        optional: false,
        unit: { gramsEquivalent: 1 },
        ingredient: {
          id: `i-${n}`,
          name: options.arachide ? "Pâte d'arachide" : `Légume ${n}`,
          category: "légume",
          allergens: options.arachide ? ["arachide"] : [],
          seasonalMonths: [],
        },
      },
    ],
  };
}

const membre = (label: string, allergies: string[] = []) => ({
  id: label,
  label,
  allergies,
  autresAllergies: [],
  regimes: [],
});
const AMINATA = [membre("Maman"), membre("Papa"), membre("Enfant 1", ["arachide"]), membre("Bébé")];

// Menu valide : déjeuner du lundi (r7), dîners en double du lundi au samedi (r1 à r6),
// restes le lendemain midi, dîner du dimanche (r8). Coût : 1200 + 6 × 2400 + 1200 = 16 800.
function repasDuMenu() {
  const repas = [];
  for (let jour = 0; jour < 7; jour++) {
    const date = new Date(`${LUNDI}T00:00:00.000Z`);
    date.setUTCDate(date.getUTCDate() + jour);
    const reste = jour > 0;
    repas.push({
      id: idRepas(jour, "lunch"),
      recipeId: reste ? idRecette(jour) : idRecette(7),
      date,
      slot: "lunch" as const,
      servings: 4,
      leftoverFromId: reste ? idRepas(jour - 1, "dinner") : null,
    });
    repas.push({
      id: idRepas(jour, "dinner"),
      recipeId: jour < 6 ? idRecette(jour + 1) : idRecette(8),
      date,
      slot: "dinner" as const,
      servings: jour < 6 ? 8 : 4,
      leftoverFromId: null,
    });
  }
  return repas;
}

function trouve(id: string, status = "draft") {
  const meals = repasDuMenu();
  const repas = meals.find((m) => m.id === id);
  const mealPlan = { id: PLAN, weekStart: new Date(`${LUNDI}T00:00:00.000Z`), status, meals };
  return { ...repas, mealPlan };
}

const planRelu = {
  id: PLAN,
  weekStart: new Date(`${LUNDI}T00:00:00.000Z`),
  status: "draft",
  estimatedCostFcfa: 16800,
  generationNotes: null,
  meals: [],
};

const misesAJour = () =>
  prisma.plannedMeal.update.mock.calls.map((appel: unknown[]) => {
    const arg = appel[0] as { where: { id: string }; data: Record<string, unknown> };
    return { id: arg.where.id, ...arg.data };
  });

beforeEach(() => {
  vi.clearAllMocks();
  exigerEcriture.mockResolvedValue(SESSION);
  listerMembres.mockResolvedValue(AMINATA);
  chargerRecettes.mockResolvedValue(Array.from({ length: 10 }, (_, i) => recette(i + 1)));
  prisma.household.findUnique.mockResolvedValue({
    weeklyBudgetFcfa: 25000,
    equipment: ["gaz"],
    cuisinesPreferred: [],
  });
  prisma.stockItem.findMany.mockResolvedValue([]);
  prisma.plannedMeal.findMany.mockResolvedValue([]);
  prisma.dishRating.findMany.mockResolvedValue([]);
  prisma.plannedMeal.findFirst.mockResolvedValue(trouve(LUNDI_MIDI));
  prisma.plannedMeal.update.mockResolvedValue({});
  prisma.mealPlan.update.mockResolvedValue({});
  prisma.mealPlan.findFirst.mockResolvedValue(planRelu);
  genererListe.mockResolvedValue({ id: "l1" });
});

describe("PATCH /api/planned-meals/[id]", () => {
  it("refuse une personne non connectée (401)", async () => {
    exigerEcriture.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    const reponse = await remplacer(requete({ recipeId: idRecette(9) }), contexte(LUNDI_MIDI));
    expect(reponse.status).toBe(401);
  });

  it("refuse une personne en lecture seule (403)", async () => {
    exigerEcriture.mockRejectedValue(new ErreurApi("LECTURESEULE"));
    const reponse = await remplacer(requete({ recipeId: idRecette(9) }), contexte(LUNDI_MIDI));
    expect(reponse.status).toBe(403);
    expect(prisma.plannedMeal.update).not.toHaveBeenCalled();
  });

  it("répond 404 pour un identifiant mal formé", async () => {
    const reponse = await remplacer(requete({ recipeId: idRecette(9) }), contexte("abc"));
    expect(reponse.status).toBe(404);
  });

  it("répond 404 pour le repas d'un autre foyer", async () => {
    prisma.plannedMeal.findFirst.mockResolvedValue(null);
    const reponse = await remplacer(requete({ recipeId: idRecette(9) }), contexte(LUNDI_MIDI));
    expect(reponse.status).toBe(404);
    const filtre = prisma.plannedMeal.findFirst.mock.calls[0][0];
    expect(filtre.where.mealPlan.householdId).toBe("f1");
  });

  it("refuse un corps invalide ou contenant un foyer (400)", async () => {
    const invalide = await remplacer(requete({ recipeId: "x" }), contexte(LUNDI_MIDI));
    expect(invalide.status).toBe(400);
    const intrus = { recipeId: idRecette(9), householdId: "f2" };
    const reponse = await remplacer(requete(intrus), contexte(LUNDI_MIDI));
    expect(reponse.status).toBe(400);
  });

  it("répond 404 pour une recette absente du catalogue", async () => {
    const reponse = await remplacer(requete({ recipeId: idRecette(99) }), contexte(LUNDI_MIDI));
    expect(reponse.status).toBe(404);
  });

  it("refuse un menu archivé (409)", async () => {
    prisma.plannedMeal.findFirst.mockResolvedValue(trouve(LUNDI_MIDI, "archived"));
    const reponse = await remplacer(requete({ recipeId: idRecette(9) }), contexte(LUNDI_MIDI));
    expect(reponse.status).toBe(409);
  });

  it("refuse une recette avec un allergène du foyer (400)", async () => {
    chargerRecettes.mockResolvedValue([recette(9, { arachide: true })]);
    const reponse = await remplacer(requete({ recipeId: idRecette(9) }), contexte(LUNDI_MIDI));
    expect(reponse.status).toBe(400);
    expect(prisma.plannedMeal.update).not.toHaveBeenCalled();
  });

  it("refuse une recette qui demande un four absent du foyer (400)", async () => {
    chargerRecettes.mockResolvedValue([recette(9, { four: true })]);
    const reponse = await remplacer(requete({ recipeId: idRecette(9) }), contexte(LUNDI_MIDI));
    expect(reponse.status).toBe(400);
  });

  it("refuse une recette qui ne se mange pas à ce créneau (400)", async () => {
    chargerRecettes.mockResolvedValue([
      ...Array.from({ length: 8 }, (_, i) => recette(i + 1)),
      recette(9, { mealTypes: ["dinner"] }),
    ]);
    const reponse = await remplacer(requete({ recipeId: idRecette(9) }), contexte(LUNDI_MIDI));
    expect(reponse.status).toBe(400);
  });

  it("refuse un remplacement qui dépasse le budget (409)", async () => {
    prisma.household.findUnique.mockResolvedValue({
      weeklyBudgetFcfa: 16000,
      equipment: ["gaz"],
      cuisinesPreferred: [],
    });
    const reponse = await remplacer(requete({ recipeId: idRecette(9) }), contexte(LUNDI_MIDI));
    expect(reponse.status).toBe(409);
    expect(prisma.plannedMeal.update).not.toHaveBeenCalled();
  });

  it("remplace un repas simple sans refaire la liste d'un brouillon", async () => {
    const reponse = await remplacer(requete({ recipeId: idRecette(9) }), contexte(LUNDI_MIDI));
    expect(reponse.status).toBe(200);
    expect(misesAJour()).toEqual([
      { id: LUNDI_MIDI, recipeId: idRecette(9), servings: 4, leftoverFromId: null },
    ]);
    expect(prisma.mealPlan.update.mock.calls[0][0].data.estimatedCostFcfa).toBe(16800);
    expect(genererListe).not.toHaveBeenCalled();
    expect((await reponse.json()).list).toBeNull();
  });

  it("refait la liste de courses quand le menu est actif", async () => {
    prisma.plannedMeal.findFirst.mockResolvedValue(trouve(LUNDI_MIDI, "active"));
    prisma.mealPlan.findFirst.mockResolvedValue({ ...planRelu, status: "active" });
    const reponse = await remplacer(requete({ recipeId: idRecette(9) }), contexte(LUNDI_MIDI));
    expect(reponse.status).toBe(200);
    expect(genererListe).toHaveBeenCalledWith(SESSION, PLAN);
    expect((await reponse.json()).list).toEqual({ id: "l1" });
  });

  it("donne la même recette au reste du lendemain midi", async () => {
    prisma.plannedMeal.findFirst.mockResolvedValue(trouve(LUNDI_SOIR));
    const reponse = await remplacer(requete({ recipeId: idRecette(9) }), contexte(LUNDI_SOIR));
    expect(reponse.status).toBe(200);
    expect(misesAJour()).toEqual([
      { id: LUNDI_SOIR, recipeId: idRecette(9), servings: 8, leftoverFromId: null },
      { id: MARDI_MIDI, recipeId: idRecette(9), servings: 4, leftoverFromId: LUNDI_SOIR },
    ]);
  });

  it("rend le reste ordinaire si la recette ne se mange pas à midi", async () => {
    chargerRecettes.mockResolvedValue([
      ...Array.from({ length: 8 }, (_, i) => recette(i + 1)),
      recette(9, { mealTypes: ["dinner"] }),
    ]);
    prisma.plannedMeal.findFirst.mockResolvedValue(trouve(LUNDI_SOIR));
    const reponse = await remplacer(requete({ recipeId: idRecette(9) }), contexte(LUNDI_SOIR));
    expect(reponse.status).toBe(200);
    expect(misesAJour()).toEqual([
      { id: LUNDI_SOIR, recipeId: idRecette(9), servings: 4, leftoverFromId: null },
      { id: MARDI_MIDI, recipeId: idRecette(1), servings: 4, leftoverFromId: null },
    ]);
  });

  it("remplacer un reste le rend ordinaire et le dîner de la veille repasse à 4 portions", async () => {
    prisma.plannedMeal.findFirst.mockResolvedValue(trouve(MARDI_MIDI));
    const reponse = await remplacer(requete({ recipeId: idRecette(9) }), contexte(MARDI_MIDI));
    expect(reponse.status).toBe(200);
    expect(misesAJour()).toEqual([
      { id: MARDI_MIDI, recipeId: idRecette(9), servings: 4, leftoverFromId: null },
      { id: LUNDI_SOIR, recipeId: idRecette(1), servings: 4, leftoverFromId: null },
    ]);
  });
});
