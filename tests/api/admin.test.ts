import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const { prisma, exigerAdmin, hash } = vi.hoisted(() => {
  const mkCrud = () => ({
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  });
  return {
    prisma: {
      recipe: mkCrud(),
      recipeIngredient: { deleteMany: vi.fn(), createMany: vi.fn() },
      ingredient: mkCrud(),
      price: mkCrud(),
      store: mkCrud(),
      user: { ...mkCrud(), count: vi.fn() },
      household: { count: vi.fn() },
      mealPlan: { count: vi.fn() },
      conversation: { count: vi.fn() },
      $transaction: (arg: unknown): unknown =>
        Array.isArray(arg) ? Promise.all(arg) : (arg as (tx: unknown) => unknown)(prisma),
    },
    exigerAdmin: vi.fn(),
    hash: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth/garde", () => ({ exigerAdmin }));
vi.mock("bcryptjs", () => ({ default: { hash }, hash }));

import { GET as listRecipes } from "@/app/api/admin/recipes/route";
import {
  GET as getRecipe,
  PUT as putRecipe,
  DELETE as deleteRecipe,
} from "@/app/api/admin/recipes/[id]/route";
import { GET as listIngredients } from "@/app/api/admin/ingredients/route";
import { DELETE as deleteIngredient } from "@/app/api/admin/ingredients/[id]/route";
import { GET as listPrices } from "@/app/api/admin/prices/route";
import { GET as listStores } from "@/app/api/admin/stores/route";
import { GET as listUsers } from "@/app/api/admin/users/route";
import { POST as resetPassword } from "@/app/api/admin/users/[id]/reset-password/route";
import { GET as getStats } from "@/app/api/admin/stats/route";

const UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

const req = (url = "http://localhost") => new Request(url);
const jsonReq = (body: unknown, method = "PUT") =>
  new Request("http://localhost", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  exigerAdmin.mockReset();
  hash.mockReset();
  exigerAdmin.mockResolvedValue({ userId: "admin1", role: "admin" });
});

describe("Admin : accès", () => {
  it("refuse un utilisateur non admin", async () => {
    exigerAdmin.mockRejectedValue(new ErreurApi("INTERDIT"));
    const r = await listRecipes();
    expect(r.status).toBe(403);
  });
});

describe("GET /api/admin/recipes", () => {
  it("retourne la liste des recettes", async () => {
    prisma.recipe.findMany.mockResolvedValue([{ id: "r1", title: "Riz" }]);
    const r = await listRecipes();
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.recipes).toHaveLength(1);
    expect(body.recipes[0].title).toBe("Riz");
  });
});

describe("GET /api/admin/recipes/[id]", () => {
  it("refuse un ID invalide", async () => {
    const r = await getRecipe(req(), params("pas-uuid"));
    expect(r.status).toBe(404);
  });

  it("retourne la recette avec ses ingrédients", async () => {
    prisma.recipe.findUnique.mockResolvedValue({ id: UUID, title: "Foutou" });
    const r = await getRecipe(req(), params(UUID));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.recipe.title).toBe("Foutou");
  });
});

describe("PUT /api/admin/recipes/[id]", () => {
  it("met à jour le champ validated seul (partiel)", async () => {
    prisma.recipe.findUnique.mockResolvedValueOnce({ id: UUID, title: "Foutou" });
    prisma.recipe.update.mockResolvedValue({ id: UUID, validated: true });
    prisma.recipe.findUnique.mockResolvedValueOnce({ id: UUID, validated: true });

    const r = await putRecipe(jsonReq({ validated: true }), params(UUID));
    expect(r.status).toBe(200);
    expect(prisma.recipe.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: UUID },
        data: expect.objectContaining({ validated: true }),
      }),
    );
  });
});

describe("DELETE /api/admin/recipes/[id]", () => {
  it("supprime une recette existante", async () => {
    prisma.recipe.findUnique.mockResolvedValue({ id: UUID });
    prisma.recipe.delete.mockResolvedValue({ id: UUID });
    const r = await deleteRecipe(req(), params(UUID));
    expect(r.status).toBe(200);
    expect(prisma.recipe.delete).toHaveBeenCalledWith({ where: { id: UUID } });
  });
});

describe("GET /api/admin/ingredients", () => {
  it("retourne la liste", async () => {
    prisma.ingredient.findMany.mockResolvedValue([{ id: "i1", name: "Tomate" }]);
    const r = await listIngredients();
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.ingredients).toHaveLength(1);
  });
});

describe("DELETE /api/admin/ingredients/[id]", () => {
  it("supprime un ingrédient existant", async () => {
    prisma.ingredient.findUnique.mockResolvedValue({ id: UUID });
    prisma.ingredient.delete.mockResolvedValue({ id: UUID });
    const r = await deleteIngredient(req(), params(UUID));
    expect(r.status).toBe(200);
  });
});

describe("GET /api/admin/prices", () => {
  it("retourne la liste", async () => {
    prisma.price.findMany.mockResolvedValue([{ id: "p1", priceFcfa: 500 }]);
    const r = await listPrices();
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.prices).toHaveLength(1);
  });
});

describe("GET /api/admin/stores", () => {
  it("retourne la liste", async () => {
    prisma.store.findMany.mockResolvedValue([{ id: "s1", name: "Marché" }]);
    const r = await listStores();
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.stores).toHaveLength(1);
  });
});

describe("GET /api/admin/users", () => {
  it("retourne la liste des utilisateurs", async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: "u1", email: "a@b.ci", fullName: "Aya", role: "user", createdAt: new Date() },
    ]);
    const r = await listUsers();
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.users).toHaveLength(1);
    expect(body.users[0].fullName).toBe("Aya");
  });
});

describe("POST /api/admin/users/[id]/reset-password", () => {
  it("refuse un mot de passe trop court", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: UUID });
    const r = await resetPassword(jsonReq({ newPassword: "abc" }, "POST"), params(UUID));
    expect(r.status).toBe(400);
  });

  it("refuse au-delà de 72 octets : bcrypt ignorerait la fin du mot de passe", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: UUID });
    const r = await resetPassword(jsonReq({ newPassword: "é".repeat(37) }, "POST"), params(UUID));
    expect(r.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("réinitialise le mot de passe", async () => {
    prisma.user.findUnique.mockResolvedValue({ id: UUID });
    hash.mockResolvedValue("hashed");
    prisma.user.update.mockResolvedValue({ id: UUID });
    const r = await resetPassword(jsonReq({ newPassword: "nouveauMDP1!" }, "POST"), params(UUID));
    expect(r.status).toBe(200);
    expect(hash).toHaveBeenCalledWith("nouveauMDP1!", 12);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: UUID },
      data: { passwordHash: "hashed" },
    });
  });
});

describe("GET /api/admin/stats", () => {
  it("retourne les compteurs", async () => {
    prisma.user.count.mockResolvedValue(10);
    prisma.household.count.mockResolvedValue(5);
    prisma.recipe.count.mockResolvedValue(3);
    prisma.ingredient.count.mockResolvedValue(12);
    prisma.price.count.mockResolvedValue(8);
    prisma.store.count.mockResolvedValue(2);
    prisma.mealPlan.count.mockResolvedValue(4);
    prisma.conversation.count.mockResolvedValue(1);
    const r = await getStats();
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.stats.utilisateurs).toBe(10);
  });
});
