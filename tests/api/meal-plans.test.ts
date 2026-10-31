import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const { prisma, exigerSession, exigerEcriture, chargerRecettes, listerMembres, genererListe } =
  vi.hoisted(() => {
    const prisma = {
      household: { findUnique: vi.fn() },
      stockItem: { findMany: vi.fn() },
      plannedMeal: { findMany: vi.fn(), create: vi.fn() },
      dishRating: { findMany: vi.fn() },
      mealPlan: {
        deleteMany: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
        updateMany: vi.fn(),
        update: vi.fn(),
      },
      // Forme fonction (génération) ou tableau d'opérations (activation)
      $transaction: (arg: unknown): unknown =>
        Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(prisma),
    };
    return {
      prisma,
      exigerSession: vi.fn(),
      exigerEcriture: vi.fn(),
      chargerRecettes: vi.fn(),
      listerMembres: vi.fn(),
      genererListe: vi.fn(),
    };
  });

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth/garde", () => ({ exigerSession, exigerEcriture }));
vi.mock("@/lib/catalogue/recettes", () => ({ chargerRecettes, lignesPourCout: () => [] }));
// 300 FCFA par portion pour toutes les recettes : le calcul du coût est testé dans cout-recette.test.ts
vi.mock("@/lib/catalogue/cout", () => ({ coutRecette: () => ({ parPersonneFcfa: 300 }) }));
vi.mock("@/lib/foyer/membres", () => ({ listerMembres }));
vi.mock("@/lib/courses/generation", () => ({ genererListe }));

import { POST as generer } from "@/app/api/meal-plans/generate/route";
import { GET as courant } from "@/app/api/meal-plans/current/route";
import { POST as activer } from "@/app/api/meal-plans/[id]/activate/route";

const MENU = "8f2b4c1e-3d5a-4e6f-9a7b-1c2d3e4f5a6b";
const SESSION = { userId: "u1", role: "user", householdId: "f1" };
const LUNDI = "2026-10-26";

const contexte = (id = MENU) => ({ params: Promise.resolve({ id }) });

const requete = (corps: unknown) =>
  new Request("http://localhost/api/meal-plans/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(corps),
  });

function recette(id: string, options: { arachide?: boolean; four?: boolean } = {}) {
  return {
    id,
    title: `Plat ${id}`,
    cuisine: "ivoirienne",
    mealTypes: ["lunch", "dinner"],
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
          id: `i-${id}`,
          name: options.arachide ? "Pâte d'arachide" : `Légume ${id}`,
          category: "légume",
          allergens: options.arachide ? ["arachide"] : [],
          seasonalMonths: [],
        },
      },
    ],
  };
}

const catalogue = (nombre: number, options: { arachide?: boolean; four?: boolean } = {}) =>
  Array.from({ length: nombre }, (_, i) => recette(`r${i + 1}`, options));

// Foyer d'Aminata : 4 personnes, un enfant allergique à l'arachide
const membre = (label: string, allergies: string[] = []) => ({
  id: label,
  label,
  allergies,
  autresAllergies: [],
  regimes: [],
});
const AMINATA = [membre("Maman"), membre("Papa"), membre("Enfant 1", ["arachide"]), membre("Bébé")];

const planLu = (status = "draft") => ({
  id: MENU,
  weekStart: new Date(`${LUNDI}T00:00:00.000Z`),
  status,
  estimatedCostFcfa: 16800,
  generationNotes: null,
  meals: [],
});

let compteur = 0;

beforeEach(() => {
  vi.clearAllMocks();
  compteur = 0;
  exigerSession.mockResolvedValue(SESSION);
  exigerEcriture.mockResolvedValue(SESSION);
  listerMembres.mockResolvedValue(AMINATA);
  prisma.household.findUnique.mockResolvedValue({
    weeklyBudgetFcfa: 25000,
    equipment: ["gaz"],
    cuisinesPreferred: [],
  });
  prisma.stockItem.findMany.mockResolvedValue([]);
  prisma.plannedMeal.findMany.mockResolvedValue([]);
  prisma.dishRating.findMany.mockResolvedValue([]);
  prisma.plannedMeal.create.mockImplementation(async () => ({ id: `m${++compteur}` }));
  prisma.mealPlan.create.mockResolvedValue({ id: MENU });
  prisma.mealPlan.findFirst.mockResolvedValue(planLu());
});

const recettesServies = () =>
  prisma.plannedMeal.create.mock.calls.map(([{ data }]) => data.recipeId as string);

describe("POST /api/meal-plans/generate", () => {
  it("refuse une personne non connectée (401)", async () => {
    exigerEcriture.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    expect((await generer(requete({ weekStart: LUNDI }))).status).toBe(401);
  });

  it("refuse une personne invitée en lecture seule (403)", async () => {
    exigerEcriture.mockRejectedValue(new ErreurApi("LECTURESEULE"));
    expect((await generer(requete({ weekStart: LUNDI }))).status).toBe(403);
    expect(prisma.mealPlan.create).not.toHaveBeenCalled();
  });

  it("exige un lundi (400)", async () => {
    const reponse = await generer(requete({ weekStart: "2026-10-27" }));
    expect(reponse.status).toBe(400);
  });

  it("refuse un foyer passé dans le corps (400)", async () => {
    const reponse = await generer(requete({ weekStart: LUNDI, householdId: "f2" }));
    expect(reponse.status).toBe(400);
  });

  it("compose 14 repas sans arachide pour le foyer d'Aminata, dans le budget (201)", async () => {
    chargerRecettes.mockResolvedValue([
      ...catalogue(10),
      recette("arachide1", { arachide: true }),
      recette("arachide2", { arachide: true }),
    ]);
    const reponse = await generer(requete({ weekStart: LUNDI }));
    expect(reponse.status).toBe(201);
    expect(recettesServies()).toHaveLength(14);
    expect(recettesServies().some((id) => id.startsWith("arachide"))).toBe(false);
    const { data } = prisma.mealPlan.create.mock.calls[0][0];
    expect(data.householdId).toBe("f1");
    expect(data.estimatedCostFcfa).toBeLessThanOrEqual(25000);
    expect(Number.isInteger(data.estimatedCostFcfa)).toBe(true);
  });

  it("remplace le brouillon de la même semaine, jamais un menu actif", async () => {
    chargerRecettes.mockResolvedValue(catalogue(10));
    await generer(requete({ weekStart: LUNDI }));
    expect(prisma.mealPlan.deleteMany).toHaveBeenCalledWith({
      where: { householdId: "f1", weekStart: new Date(`${LUNDI}T00:00:00.000Z`), status: "draft" },
    });
  });

  it("écarte les recettes au four quand le foyer n'en a pas", async () => {
    chargerRecettes.mockResolvedValue([...catalogue(10), recette("four1", { four: true })]);
    await generer(requete({ weekStart: LUNDI }));
    expect(recettesServies()).not.toContain("four1");
  });

  it("signale un manque de recettes adaptées (409)", async () => {
    chargerRecettes.mockResolvedValue(catalogue(10, { arachide: true }));
    const reponse = await generer(requete({ weekStart: LUNDI }));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).error.code).toBe("RECETTESINSUFFISANTES");
  });

  it("signale un budget trop petit (409)", async () => {
    chargerRecettes.mockResolvedValue(catalogue(10));
    prisma.household.findUnique.mockResolvedValue({
      weeklyBudgetFcfa: 1000,
      equipment: [],
      cuisinesPreferred: [],
    });
    const reponse = await generer(requete({ weekStart: LUNDI }));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).error.code).toBe("BUDGETINSUFFISANT");
  });
});

describe("GET /api/meal-plans/current", () => {
  it("refuse une personne non connectée (401)", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    expect((await courant()).status).toBe(401);
  });

  it("renvoie le menu actif du foyer de la session", async () => {
    prisma.mealPlan.findFirst.mockResolvedValueOnce(planLu("active"));
    const reponse = await courant();
    expect(reponse.status).toBe(200);
    expect((await reponse.json()).plan).toMatchObject({
      id: MENU,
      weekStart: LUNDI,
      status: "active",
    });
    expect(prisma.mealPlan.findFirst.mock.calls[0][0].where.householdId).toBe("f1");
  });

  it("renvoie null sans menu", async () => {
    prisma.mealPlan.findFirst.mockResolvedValue(null);
    expect((await (await courant()).json()).plan).toBeNull();
  });
});

describe("POST /api/meal-plans/:id/activate", () => {
  const planAvecRecettes = (recettes: ReturnType<typeof recette>[]) => ({
    ...planLu(),
    meals: recettes.map((r) => ({ recipe: r })),
  });

  it("refuse une personne invitée en lecture seule (403)", async () => {
    exigerEcriture.mockRejectedValue(new ErreurApi("LECTURESEULE"));
    expect((await activer(new Request("http://localhost"), contexte())).status).toBe(403);
    expect(prisma.mealPlan.update).not.toHaveBeenCalled();
  });

  it("ne trouve pas le menu d'un autre foyer (404)", async () => {
    prisma.mealPlan.findFirst.mockResolvedValue(null);
    const reponse = await activer(new Request("http://localhost"), contexte());
    expect(reponse.status).toBe(404);
    expect(prisma.mealPlan.findFirst.mock.calls[0][0].where).toEqual({
      id: MENU,
      householdId: "f1",
    });
  });

  it("traite un identifiant mal formé comme introuvable (404)", async () => {
    expect((await activer(new Request("http://localhost"), contexte("abc"))).status).toBe(404);
  });

  it("active le menu, archive l'ancien et calcule la liste de courses", async () => {
    prisma.mealPlan.findFirst
      .mockResolvedValueOnce(planAvecRecettes([recette("r1")]))
      .mockResolvedValueOnce(planLu("active"));
    genererListe.mockResolvedValue({ id: "liste1" });
    const reponse = await activer(new Request("http://localhost"), contexte());
    expect(reponse.status).toBe(200);
    const corps = await reponse.json();
    expect(corps.plan.status).toBe("active");
    expect(corps.list).toEqual({ id: "liste1" });
    expect(prisma.mealPlan.updateMany).toHaveBeenCalledWith({
      where: { householdId: "f1", status: "active", id: { not: MENU } },
      data: { status: "archived" },
    });
    expect(genererListe).toHaveBeenCalledWith(SESSION, MENU);
  });

  it("refuse un menu devenu incompatible avec les allergies (409)", async () => {
    prisma.mealPlan.findFirst.mockResolvedValueOnce(
      planAvecRecettes([recette("r1"), recette("a1", { arachide: true })]),
    );
    const reponse = await activer(new Request("http://localhost"), contexte());
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).error.code).toBe("MENUINCOMPATIBLE");
    expect(prisma.mealPlan.update).not.toHaveBeenCalled();
  });
});
