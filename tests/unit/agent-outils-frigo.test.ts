import { beforeEach, describe, expect, it, vi } from "vitest";

// Outils d'Umi : vider le frigo sans rien acheter, changer les portions, recherche sans résultat.

const mocks = vi.hoisted(() => ({
  suggererRecettes: vi.fn(),
  controlerIdee: vi.fn(),
  lireAlimentsAutorises: vi.fn(),
  listerCatalogue: vi.fn(),
  creerProposition: vi.fn(),
  plannedMealFindUnique: vi.fn(),
  plannedMealFindFirst: vi.fn(),
  recipeFindUnique: vi.fn(),
}));

vi.mock("@/lib/stock/vider-frigo", () => ({ suggererRecettes: mocks.suggererRecettes }));
vi.mock("@/lib/agent/idees-frigo", () => ({
  controlerIdee: mocks.controlerIdee,
  lireAlimentsAutorises: mocks.lireAlimentsAutorises,
}));
vi.mock("@/lib/catalogue/recettes", () => ({ listerCatalogue: mocks.listerCatalogue }));
vi.mock("@/lib/agent/proposals", () => ({ creerProposition: mocks.creerProposition }));
vi.mock("@/lib/db", () => ({
  prisma: {
    plannedMeal: { findUnique: mocks.plannedMealFindUnique, findFirst: mocks.plannedMealFindFirst },
    recipe: { findUnique: mocks.recipeFindUnique },
  },
}));

import { findRecipesFromStock } from "@/lib/agent/tools/find-recipes-from-stock";
import { proposerIdeeFrigo } from "@/lib/agent/tools/proposer-idee-frigo";
import { proposeMealChange } from "@/lib/agent/tools/propose-meal-change";
import { searchRecipes } from "@/lib/agent/tools/search-recipes";
import { proposerRepasCuisine } from "@/lib/agent/tools/proposer-repas-cuisine";
import type { SessionVerifiee } from "@/lib/auth/garde";

const SESSION: SessionVerifiee = {
  userId: "u1",
  role: "user",
  householdId: "h1",
  acces: "proprietaire",
};
const REPAS = "77777777-7777-4777-8777-777777777777";
const RECETTE = "88888888-8888-4888-8888-888888888888";

const recetteDuCatalogue = (title: string) => ({
  id: title,
  title,
  cuisine: "ivoirienne",
  minutes: 30,
  servings: 4,
  cout: { totalFcfa: 2000 },
  tags: [],
  ingredients: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.creerProposition.mockResolvedValue({
    id: "prop-1",
    type: "mealChange",
    status: "pending",
    expiresAt: "2026-11-11T12:00:00.000Z",
  });
  mocks.plannedMealFindUnique.mockResolvedValue({
    id: REPAS,
    servings: 4,
    recipe: { title: "Garba" },
    mealPlan: { householdId: "h1" },
  });
});

describe("findRecipesFromStock : rien à acheter", () => {
  it("utilise la même logique que la page Vider le frigo, pour le nombre de personnes donné", async () => {
    mocks.suggererRecettes.mockResolvedValue([
      { id: "r1", title: "Pain omelette", prepMinutes: 5, cookMinutes: 5, utiliseUseSoon: true },
      { id: "r2", title: "Long plat", prepMinutes: 30, cookMinutes: 60, utiliseUseSoon: false },
    ]);
    const resultat = await findRecipesFromStock.executer(
      SESSION,
      { personnes: 2, maxMinutes: 20 },
      { conversationId: "c1" },
    );
    expect(mocks.suggererRecettes).toHaveBeenCalledWith(SESSION, 2);
    expect(resultat.total).toBe(1);
    expect(resultat.recettes).toEqual([
      { id: "r1", titre: "Pain omelette", minutes: 10, utiliseUnAlimentAUtiliserVite: true },
    ]);
  });

  it("sans recette faisable, oriente vers une idée avec le stock, jamais vers un achat", async () => {
    mocks.suggererRecettes.mockResolvedValue([]);
    const aliments = [
      { ingredientId: "i1", nom: "Attiéké", quantites: ["1 boule"], aUtiliserVite: false },
    ];
    mocks.lireAlimentsAutorises.mockResolvedValue(aliments);
    const resultat = await findRecipesFromStock.executer(SESSION, {}, { conversationId: "c1" });
    expect(resultat.total).toBe(0);
    // Le stock autorisé arrive avec la réponse : un appel au modèle en moins
    expect(resultat.alimentsAutorises).toEqual(aliments);
    expect(resultat.message).toContain("proposerIdeeFrigo");
    expect(resultat.message).toContain("Ne propose pas d'achat");
  });
});

describe("proposerIdeeFrigo : le code vérifie avant que la famille voie l'idée", () => {
  const input = {
    titre: "Attiéké aux œufs",
    ingredientIds: ["11111111-1111-4111-8111-111111111111"],
    etapes: ["Brouiller les œufs."],
    personnes: 4,
  };

  it("affiche la carte seulement si l'idée est acceptée", async () => {
    const ideeVerifiee = {
      titre: "Attiéké aux œufs",
      personnes: 4,
      minutes: null,
      ingredients: [],
      etapes: [],
    };
    mocks.controlerIdee.mockResolvedValue({ ok: true, idee: ideeVerifiee });
    const afficher = vi.fn();
    const resultat = await proposerIdeeFrigo.executer(SESSION, input, {
      conversationId: "c1",
      afficher,
    });
    expect(afficher).toHaveBeenCalledWith({ type: "idee", idee: ideeVerifiee });
    expect(resultat.refusee).toBe(false);
  });

  it("une idée refusée n'est jamais montrée ; l'IA reçoit la raison pour corriger", async () => {
    mocks.controlerIdee.mockResolvedValue({ ok: false, raison: "interdit pour un membre" });
    const afficher = vi.fn();
    const resultat = await proposerIdeeFrigo.executer(SESSION, input, {
      conversationId: "c1",
      afficher,
    });
    expect(afficher).not.toHaveBeenCalled();
    expect(resultat).toEqual({ refusee: true, erreur: "interdit pour un membre" });
  });

  it("refuse une idée sans ingrédient ou avec trop de personnes", () => {
    expect(proposerIdeeFrigo.schema.safeParse({ ...input, ingredientIds: [] }).success).toBe(false);
    expect(proposerIdeeFrigo.schema.safeParse({ ...input, personnes: 51 }).success).toBe(false);
  });
});

describe("proposeMealChange : recette ou portions, une seule à la fois", () => {
  it("propose de changer les portions d'un repas (invités)", async () => {
    const resultat = await proposeMealChange.executer(
      SESSION,
      { repasId: REPAS, portions: 12 },
      { conversationId: "c1" },
    );
    expect(mocks.creerProposition).toHaveBeenCalledWith("c1", "mealChange", {
      repasId: REPAS,
      ancienneRecette: "Garba",
      portions: 12,
      anciennesPortions: 4,
    });
    expect(resultat.portions).toBe(12);
    expect(mocks.recipeFindUnique).not.toHaveBeenCalled();
  });

  it("refuse de changer la recette et les portions dans la même proposition", () => {
    const schema = proposeMealChange.schema;
    expect(schema.safeParse({ repasId: REPAS, recetteId: RECETTE, portions: 6 }).success).toBe(
      false,
    );
    expect(schema.safeParse({ repasId: REPAS }).success).toBe(false);
    expect(schema.safeParse({ repasId: REPAS, portions: 51 }).success).toBe(false);
  });

  it("refuse un repas d'un autre foyer", async () => {
    mocks.plannedMealFindUnique.mockResolvedValue({
      id: REPAS,
      servings: 4,
      recipe: { title: "Garba" },
      mealPlan: { householdId: "autre" },
    });
    const resultat = await proposeMealChange.executer(
      SESSION,
      { repasId: REPAS, portions: 8 },
      { conversationId: "c1" },
    );
    expect(resultat.erreur).toBeTruthy();
    expect(mocks.creerProposition).not.toHaveBeenCalled();
  });
});

describe("searchRecipes : des mots-clés sans résultat", () => {
  it("renvoie les recettes des autres critères au lieu de rien", async () => {
    mocks.listerCatalogue
      .mockResolvedValueOnce({ recettes: [], masquees: 0 })
      .mockResolvedValueOnce({ recettes: [recetteDuCatalogue("Poulet braisé")], masquees: 1 });
    const resultat = await searchRecipes.executer(
      SESSION,
      { texte: "grand repas de fête", maxMinutes: 60 },
      { conversationId: "c1" },
    );
    expect(mocks.listerCatalogue).toHaveBeenLastCalledWith(
      SESSION,
      expect.objectContaining({ q: undefined, temps: 90 }),
    );
    expect(resultat.total).toBe(1);
    expect(resultat.message).toContain("Ne relance pas");
  });

  it("garde le résultat habituel quand les mots-clés trouvent des recettes", async () => {
    mocks.listerCatalogue.mockResolvedValue({
      recettes: [recetteDuCatalogue("Garba")],
      masquees: 0,
    });
    const resultat = await searchRecipes.executer(
      SESSION,
      { texte: "garba" },
      { conversationId: "c1" },
    );
    expect(mocks.listerCatalogue).toHaveBeenCalledTimes(1);
    expect(resultat).not.toHaveProperty("message");
  });
});

describe("proposerRepasCuisine : la famille confirme en appuyant", () => {
  const repas = (extra = {}) => ({
    id: REPAS,
    date: new Date("2026-11-11T00:00:00Z"),
    slot: "dinner",
    status: "planned",
    leftoverFromId: null,
    recipe: { title: "Garba" },
    mealPlan: { status: "active" },
    ...extra,
  });

  it("montre le repas du foyer avec le bouton, sans rien écrire", async () => {
    mocks.plannedMealFindFirst.mockResolvedValue(repas());
    const afficher = vi.fn();
    await proposerRepasCuisine.executer(
      SESSION,
      { repasId: REPAS },
      { conversationId: "c1", afficher },
    );
    expect(mocks.plannedMealFindFirst.mock.calls[0][0].where).toEqual({
      id: REPAS,
      mealPlan: { householdId: "h1" },
    });
    expect(afficher).toHaveBeenCalledWith({
      type: "cuisine",
      repas: { id: REPAS, titre: "Garba", date: "2026-11-11", creneau: "dinner" },
    });
  });

  it.each([
    ["d'un autre foyer", null, "introuvable"],
    ["d'un menu pas encore validé", repas({ mealPlan: { status: "draft" } }), "pas encore validé"],
    ["de restes", repas({ leftoverFromId: "autre" }), "restes"],
    ["déjà cuisiné", repas({ status: "cooked" }), "déjà"],
  ])("refuse un repas %s", async (_cas, trouve, message) => {
    mocks.plannedMealFindFirst.mockResolvedValue(trouve);
    const afficher = vi.fn();
    const resultat = await proposerRepasCuisine.executer(
      SESSION,
      { repasId: REPAS },
      { conversationId: "c1", afficher },
    );
    expect(String(resultat.erreur)).toContain(message);
    expect(afficher).not.toHaveBeenCalled();
  });
});
