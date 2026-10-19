import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const { recipe, dishRating, exigerSession, listerMembres } = vi.hoisted(() => ({
  recipe: { findMany: vi.fn() },
  dishRating: { upsert: vi.fn(), deleteMany: vi.fn() },
  exigerSession: vi.fn(),
  listerMembres: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma: { recipe, dishRating } }));
// exigerEcriture renvoie la même session : son refus en lecture seule est testé dans garde.test.ts
vi.mock("@/lib/auth/garde", () => ({ exigerSession, exigerEcriture: exigerSession }));
vi.mock("@/lib/foyer/membres", () => ({ listerMembres }));

import { POST } from "@/app/api/household/ratings/route";

const ID = "8f2b4c1e-3d5a-4e6f-9a7b-1c2d3e4f5a6b";

const requete = (corps: unknown) =>
  new Request("http://localhost/api/household/ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });

const garba = {
  id: ID,
  title: "Garba",
  cuisine: "ivoirienne",
  ingredients: [
    { ingredient: { name: "Thon frais", category: "poisson", allergens: ["poisson"] } },
  ],
};

beforeEach(() => {
  for (const fn of [recipe.findMany, dishRating.upsert, dishRating.deleteMany, exigerSession]) {
    fn.mockReset();
  }
  listerMembres.mockReset();
  exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: "f1" });
  listerMembres.mockResolvedValue([]);
  recipe.findMany.mockResolvedValue([garba]);
});

describe("POST /api/household/ratings", () => {
  it("refuse une requête sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    expect((await POST(requete({ recipeId: ID, rating: 3 }))).status).toBe(401);
    expect(dishRating.upsert).not.toHaveBeenCalled();
  });

  it("refuse une personne invitée en lecture seule (403), sans rien écrire", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("LECTURESEULE"));
    expect((await POST(requete({ recipeId: ID, rating: 3 }))).status).toBe(403);
    expect(dishRating.upsert).not.toHaveBeenCalled();
  });

  it("demande de décrire d'abord le foyer", async () => {
    exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: null });
    expect((await POST(requete({ recipeId: ID, rating: 3 }))).status).toBe(409);
  });

  it("refuse une note invalide ou un identifiant de foyer glissé dans la requête", async () => {
    expect((await POST(requete({ recipeId: ID, rating: 5 }))).status).toBe(400);
    expect((await POST(requete({ recipeId: ID, rating: 3, householdId: "f2" }))).status).toBe(400);
    expect(dishRating.upsert).not.toHaveBeenCalled();
  });

  it("répond introuvable pour un plat inexistant", async () => {
    recipe.findMany.mockResolvedValue([]);
    expect((await POST(requete({ recipeId: ID, rating: 3 }))).status).toBe(404);
  });

  it("refuse de noter un plat qui ne convient pas au foyer", async () => {
    listerMembres.mockResolvedValue([
      {
        label: "Awa",
        allergies: ["poisson"],
        autresAllergies: [],
        regimes: [],
      },
    ]);
    expect((await POST(requete({ recipeId: ID, rating: 3 }))).status).toBe(404);
    expect(dishRating.upsert).not.toHaveBeenCalled();
  });

  it("enregistre la note pour le foyer de la session seulement (compte A, jamais B)", async () => {
    const reponse = await POST(requete({ recipeId: ID, rating: 3 }));
    expect(reponse.status).toBe(200);
    expect(dishRating.upsert).toHaveBeenCalledWith({
      where: { householdId_recipeId: { householdId: "f1", recipeId: ID } },
      update: { rating: 3 },
      create: { householdId: "f1", recipeId: ID, rating: 3 },
    });
  });

  it("retire la note avec null, seulement dans le foyer de la session", async () => {
    await POST(requete({ recipeId: ID, rating: null }));
    expect(dishRating.deleteMany).toHaveBeenCalledWith({
      where: { householdId: "f1", recipeId: ID },
    });
    expect(dishRating.upsert).not.toHaveBeenCalled();
  });
});
