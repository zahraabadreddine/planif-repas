import { describe, expect, it, vi } from "vitest";
import type { SuggestionRecette } from "@/lib/stock/vider-frigo";

const { suggererRecettes } = vi.hoisted(() => ({ suggererRecettes: vi.fn() }));
vi.mock("@/lib/stock/vider-frigo", () => ({ suggererRecettes }));

import { suggestionsUrgence } from "@/lib/urgence/suggestion";

const SESSION = { userId: "u1", role: "user" as const, householdId: "f1", acces: "edit" as const };

const suggestion = (
  id: string,
  minutes: number,
  mealTypes: SuggestionRecette["mealTypes"],
  utiliseUseSoon = false,
): SuggestionRecette => ({
  id,
  title: id,
  cuisine: "ivoirienne",
  prepMinutes: minutes,
  cookMinutes: 0,
  servings: 4,
  difficulty: 1,
  tags: [],
  mealTypes,
  utiliseUseSoon,
});

describe("suggestions du mode urgence", () => {
  it("ne propose que des plats du soir : jamais un petit-déjeuner pour remplacer le dîner", async () => {
    suggererRecettes.mockResolvedValue([
      suggestion("pain-omelette", 10, ["breakfast"]),
      suggestion("aubergines", 20, ["lunch", "dinner"]),
    ]);
    const options = await suggestionsUrgence(SESSION, 20);
    expect(options.map((o) => o.id)).toEqual(["aubergines"]);
  });

  it("garde le temps maximum, les produits à consommer vite d'abord, 3 options au plus", async () => {
    suggererRecettes.mockResolvedValue([
      suggestion("a", 15, ["dinner"]),
      suggestion("b", 10, ["dinner"]),
      suggestion("c", 18, ["dinner"], true),
      suggestion("d", 12, ["dinner"]),
      suggestion("long", 45, ["dinner"]),
    ]);
    const options = await suggestionsUrgence(SESSION, 20);
    expect(options.map((o) => o.id)).toEqual(["c", "b", "d"]);
  });
});
