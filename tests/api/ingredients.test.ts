import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const { prisma, exigerSession } = vi.hoisted(() => ({
  prisma: { ingredient: { findMany: vi.fn() }, marketUnit: { findFirst: vi.fn() } },
  exigerSession: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth/garde", () => ({ exigerSession }));

import { GET } from "@/app/api/ingredients/route";

beforeEach(() => {
  vi.clearAllMocks();
  exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: "f1", acces: "edit" });
  prisma.ingredient.findMany.mockResolvedValue([
    {
      id: "i-crevettes",
      name: "Crevettes",
      category: "fruits de mer",
      defaultUnitId: "u-tas",
      units: [{ id: "u-tas", label: "tas", gramsEquivalent: 250 }],
    },
  ]);
  prisma.marketUnit.findFirst.mockResolvedValue({ id: "u-kg", label: "kg", gramsEquivalent: 1000 });
});

describe("GET /api/ingredients", () => {
  it("refuse une requête sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    expect((await GET()).status).toBe(401);
  });

  it("propose les unités de l'ingrédient et le kg, avec l'équivalence", async () => {
    const [crevettes] = await (await GET()).json();
    expect(crevettes.units).toEqual([
      { id: "u-tas", label: "tas", grams: 250, equivalence: "1 tas ≈ 250 g" },
      { id: "u-kg", label: "kg", grams: 1000, equivalence: null },
    ]);
    expect(crevettes.defaultUnitId).toBe("u-tas");
  });

  it("ne propose jamais le gramme ni le ml : seul le kg générique est cherché", async () => {
    await GET();
    expect(prisma.marketUnit.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ingredientId: null, label: "kg" } }),
    );
  });
});
