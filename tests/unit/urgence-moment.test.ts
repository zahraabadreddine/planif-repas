import { describe, expect, it, vi } from "vitest";

// Mode urgence selon l'heure : le repas du moment est remplacé, le repas prévu glisse.

const mocks = vi.hoisted(() => ({ suggererRecettes: vi.fn(), plannedMealFindFirst: vi.fn() }));
vi.mock("@/lib/stock/vider-frigo", () => ({ suggererRecettes: mocks.suggererRecettes }));
vi.mock("@/lib/db", () => ({ prisma: { plannedMeal: { findFirst: mocks.plannedMealFindFirst } } }));

import { creneauDuMoment, MOMENTS } from "@/lib/planificateur/moment";
import {
  decalerDejeuners,
  NOUVEAUREPAS,
  type RepasPlace,
} from "@/lib/planificateur/reorganisation";
import { creneauUrgence, repasDeLaSemaine } from "@/lib/planificateur/modification";
import { suggestionsUrgence } from "@/lib/urgence/suggestion";
import type { SessionVerifiee } from "@/lib/auth/garde";

// Abidjan est à UTC+0 toute l'année : l'heure UTC est l'heure d'Abidjan
const a = (heure: string) => new Date(`2026-11-11T${heure}:00Z`);

describe("le repas du moment, à l'heure d'Abidjan", () => {
  it("avant 12 h : petit déjeuner", () => {
    expect(creneauDuMoment(a("06:30"))).toBe("breakfast");
    expect(creneauDuMoment(a("11:59"))).toBe("breakfast");
  });

  it("de 12 h à 17 h : déjeuner", () => {
    expect(creneauDuMoment(a("12:00"))).toBe("lunch");
    expect(creneauDuMoment(a("16:59"))).toBe("lunch");
  });

  it("à partir de 17 h : on prépare déjà le dîner", () => {
    expect(creneauDuMoment(a("17:00"))).toBe("dinner");
    expect(creneauDuMoment(a("18:00"))).toBe("dinner");
    expect(creneauDuMoment(a("23:30"))).toBe("dinner");
  });

  it("se dit simplement à la famille", () => {
    expect(MOMENTS.lunch).toEqual({ ce: "ce midi", demain: "demain midi" });
  });
});

const repas = (
  id: string,
  jour: number,
  slot: "lunch" | "dinner",
  leftoverFromId: string | null = null,
): RepasPlace => ({
  id,
  recipeId: `recette-${id}`,
  jour,
  slot,
  servings: 4,
  leftoverFromId,
});

describe("urgence à midi : les déjeuners glissent", () => {
  it("le déjeuner prévu glisse au midi suivant, et les suivants avec lui", () => {
    const semaine = [repas("L2", 2, "lunch"), repas("L3", 3, "lunch"), repas("L4", 4, "lunch")];
    const { repas: apres, retires } = decalerDejeuners(semaine, 2, "rapide", 4);
    const jourDe = (id: string) => apres.find((r) => r.id === id)?.jour;
    expect(jourDe("L2")).toBe(3);
    expect(jourDe("L3")).toBe(4);
    expect(jourDe("L4")).toBe(5);
    expect(retires).toEqual([]);
    expect(apres.find((r) => r.id === NOUVEAUREPAS)).toMatchObject({
      recipeId: "rapide",
      jour: 2,
      slot: "lunch",
      servings: 4,
    });
  });

  it("un midi de restes ne bouge pas : le déjeuner ordinaire passe par-dessus", () => {
    const semaine = [
      repas("L2", 2, "lunch"),
      repas("D2", 2, "dinner"),
      repas("R3", 3, "lunch", "D2"),
      repas("L4", 4, "lunch"),
    ];
    const { repas: apres } = decalerDejeuners(semaine, 2, "rapide", 4);
    const jourDe = (id: string) => apres.find((r) => r.id === id)?.jour;
    expect(jourDe("R3")).toBe(3);
    expect(jourDe("L2")).toBe(4);
    expect(jourDe("L4")).toBe(5);
  });

  it("le dernier déjeuner sans place sort du menu (ses ingrédients restent en stock)", () => {
    const semaine = [repas("L5", 5, "lunch"), repas("L6", 6, "lunch")];
    const { retires } = decalerDejeuners(semaine, 5, "rapide", 4);
    expect(retires).toEqual(["L6"]);
  });

  it("des restes ce midi ne sont jamais remplacés : ce serait les jeter", () => {
    const semaine = [repas("D1", 1, "dinner"), repas("R2", 2, "lunch", "D1")];
    expect(() => decalerDejeuners(semaine, 2, "rapide", 4)).toThrow("restes");
  });
});

describe("la semaine ordinaire met de côté le petit déjeuner d'urgence", () => {
  it("ni plat de fête ni petit déjeuner dans la vérification de la semaine", () => {
    expect(
      repasDeLaSemaine([
        { id: "a", slot: "lunch", course: null },
        { id: "b", slot: "breakfast", course: null },
        { id: "c", slot: "dinner", course: "plat" },
      ]),
    ).toEqual([{ id: "a", slot: "lunch", course: null }]);
  });
});

describe("plats proposés selon le moment", () => {
  const SESSION: SessionVerifiee = {
    userId: "u1",
    role: "user",
    householdId: "h1",
    acces: "proprietaire",
  };
  const plat = (title: string, mealTypes: string[]) => ({
    id: title,
    title,
    mealTypes,
    prepMinutes: 5,
    cookMinutes: 5,
    utiliseUseSoon: false,
  });

  it("le matin, pas de sauce graine : seulement ce qui se mange au petit déjeuner", async () => {
    mocks.suggererRecettes.mockResolvedValue([
      plat("Pain omelette", ["breakfast", "dinner"]),
      plat("Sauce graine", ["lunch", "dinner"]),
    ]);
    const options = await suggestionsUrgence(SESSION, 30, undefined, "breakfast");
    expect(options.map((o) => o.title)).toEqual(["Pain omelette"]);
  });

  it("sans moment précisé, le dîner comme avant", async () => {
    mocks.suggererRecettes.mockResolvedValue([
      plat("Bouillie", ["breakfast"]),
      plat("Garba", ["dinner"]),
    ]);
    const options = await suggestionsUrgence(SESSION, 30);
    expect(options.map((o) => o.title)).toEqual(["Garba"]);
  });
});

describe("audit : l'urgence ne touche jamais une fête, et dit vrai sur le repas remplacé", () => {
  const SESSION: SessionVerifiee = {
    userId: "u1",
    role: "user",
    householdId: "h1",
    acces: "proprietaire",
  };

  it("un déjeuner ordinaire ne glisse jamais sur le midi d'une fête", () => {
    const semaine = [repas("L2", 2, "lunch"), repas("L3", 3, "lunch")];
    // Le jour 3 est le midi de la fête : L2 passe directement au jour 4
    const { repas: apres } = decalerDejeuners(semaine, 2, "rapide", 4, [3]);
    expect(apres.find((r) => r.id === "L2")?.jour).toBe(4);
    expect(apres.some((r) => r.slot === "lunch" && r.jour === 3 && r.id !== "L3")).toBe(false);
  });

  it("à midi sans déjeuner prévu aujourd'hui, l'écran propose les plats du dîner", async () => {
    mocks.plannedMealFindFirst.mockResolvedValue(null);
    expect(await creneauUrgence(SESSION, a("13:00"))).toBe("dinner");
  });

  it("à midi avec un déjeuner prévu, c'est bien le déjeuner", async () => {
    mocks.plannedMealFindFirst.mockResolvedValue({ id: "midi" });
    expect(await creneauUrgence(SESSION, a("13:00"))).toBe("lunch");
    expect(mocks.plannedMealFindFirst.mock.calls.at(-1)?.[0].where).toMatchObject({
      slot: "lunch",
      status: "planned",
      mealPlan: { householdId: "h1", status: "active" },
    });
  });

  it("le matin et le soir ne dépendent que de l'heure", async () => {
    expect(await creneauUrgence(SESSION, a("08:00"))).toBe("breakfast");
    expect(await creneauUrgence(SESSION, a("19:00"))).toBe("dinner");
  });
});
