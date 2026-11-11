import { beforeEach, describe, expect, it, vi } from "vitest";

// Menu de fête : plusieurs plats au même repas, coût et budget calculés par le code,
// vérifiés à nouveau quand la famille l'ajoute à son menu (règles 1, 2, 3 et 4).

const mocks = vi.hoisted(() => ({
  recipeFindMany: vi.fn(),
  householdFindUnique: vi.fn(),
  mealPlanFindMany: vi.fn(),
  plannedMealFindFirst: vi.fn(),
  plannedMealUpdate: vi.fn(),
  plannedMealDeleteMany: vi.fn(),
  plannedMealCreateMany: vi.fn(),
  listerMembres: vi.fn(),
  genererListe: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const plannedMeal = {
    findFirst: mocks.plannedMealFindFirst,
    update: mocks.plannedMealUpdate,
    deleteMany: mocks.plannedMealDeleteMany,
    createMany: mocks.plannedMealCreateMany,
  };
  return {
    prisma: {
      recipe: { findMany: mocks.recipeFindMany },
      household: { findUnique: mocks.householdFindUnique },
      mealPlan: { findMany: mocks.mealPlanFindMany },
      plannedMeal,
      $transaction: (fn: (tx: unknown) => unknown) => fn({ plannedMeal }),
    },
  };
});
vi.mock("@/lib/foyer/membres", () => ({ listerMembres: mocks.listerMembres }));
vi.mock("@/lib/courses/generation", () => ({ genererListe: mocks.genererListe }));

import { appliquerFete, chiffrerFete, composerFete, raisonRefus } from "@/lib/planificateur/fete";
import { horsFete, remplacerRepas } from "@/lib/planificateur/modification";
import { feteSchema, type DemandeFete } from "@/lib/validation/fete";
import type { SessionVerifiee } from "@/lib/auth/garde";

const SESSION: SessionVerifiee = {
  userId: "u1",
  role: "user",
  householdId: "h1",
  acces: "proprietaire",
};
const HOUMOUS = "11111111-1111-4111-8111-111111111111";
const KEBBE = "22222222-2222-4222-8222-222222222222";
const JEUDI = new Date("2026-11-12T00:00:00Z");

/** Une recette pour 4 personnes : 1 kg à 2 000 FCFA/kg, soit 2 000 FCFA pour 4. */
const recette = (id: string, title: string, extra: Record<string, unknown> = {}) => ({
  id,
  title,
  servings: 4,
  tags: [],
  ingredients: [
    {
      quantity: 1000,
      optional: false,
      unit: { gramsEquivalent: 1 },
      ingredient: {
        name: `${title} (ingrédient)`,
        category: "légume",
        allergens: [],
        prices: [
          {
            priceFcfa: 2000,
            unit: { gramsEquivalent: 1000 },
            source: "team",
            observedAt: new Date(),
            placeType: "market",
          },
        ],
      },
    },
  ],
  ...extra,
});

const demande = (extra: Partial<DemandeFete> = {}): DemandeFete => ({
  date: "2026-11-12",
  creneau: "lunch",
  personnes: 20,
  budgetFcfa: 100000,
  plats: [
    { recetteId: KEBBE, categorie: "plat" },
    { recetteId: HOUMOUS, categorie: "entrée" },
  ],
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.recipeFindMany.mockResolvedValue([recette(HOUMOUS, "Houmous"), recette(KEBBE, "Kebbé")]);
  mocks.householdFindUnique.mockResolvedValue({ equipment: [] });
  mocks.listerMembres.mockResolvedValue([]);
  mocks.mealPlanFindMany.mockResolvedValue([
    {
      id: "menu-1",
      status: "active",
      meals: [
        {
          id: "repas-jeudi",
          date: JEUDI,
          slot: "lunch",
          status: "planned",
          servings: 4,
          leftoverFromId: null,
        },
        {
          id: "diner-jeudi",
          date: JEUDI,
          slot: "dinner",
          status: "planned",
          servings: 4,
          leftoverFromId: null,
        },
      ],
    },
  ]);
});

describe("chiffrer un menu de fête", () => {
  it("additionne les plats, les range entrée → dessert et compare au budget", () => {
    const fete = chiffrerFete(demande(), [
      { recetteId: "d", titre: "Gâteau", categorie: "dessert", coutFcfa: 8000, sansPrix: [] },
      {
        recetteId: "e",
        titre: "Houmous",
        categorie: "entrée",
        coutFcfa: 5000,
        sansPrix: ["Tahiné"],
      },
    ]);
    expect(fete.plats.map((p) => p.categorie)).toEqual(["entrée", "dessert"]);
    expect(fete.totalFcfa).toBe(13000);
    expect(fete.depassementFcfa).toBe(0);
    expect(fete.sansPrix).toEqual(["Tahiné"]);
    expect(
      chiffrerFete(demande({ budgetFcfa: 10000 }), [
        ...fete.plats.map((p) => ({ ...p, sansPrix: [] })),
      ]).depassementFcfa,
    ).toBe(3000);
  });

  it("le coût de chaque plat est calculé par le code pour le nombre d'invités", async () => {
    const fete = await composerFete(SESSION, demande());
    // 2 000 FCFA pour 4 personnes → 10 000 FCFA pour 20
    expect(fete.plats).toEqual([
      { recetteId: HOUMOUS, titre: "Houmous", categorie: "entrée", coutFcfa: 10000 },
      { recetteId: KEBBE, titre: "Kebbé", categorie: "plat", coutFcfa: 10000 },
    ]);
    expect(fete.totalFcfa).toBe(20000);
  });
});

describe("plats refusés par le code", () => {
  it("seuls les plats visibles du foyer : le catalogue validé et ses propres plats (règle 4)", async () => {
    await composerFete(SESSION, demande());
    expect(mocks.recipeFindMany.mock.calls[0][0].where).toMatchObject({
      OR: [{ validated: true, householdId: null }, { householdId: "h1" }],
    });
  });

  it("un plat d'un autre foyer ou inexistant est introuvable", async () => {
    mocks.recipeFindMany.mockResolvedValue([recette(HOUMOUS, "Houmous")]);
    await expect(composerFete(SESSION, demande())).rejects.toThrow("pas disponible");
  });

  it("un allergène d'un membre fait refuser le plat", () => {
    const avecArachide = recette(KEBBE, "Kebbé", {
      ingredients: [
        { ingredient: { name: "Pâte d'arachide", category: "épicerie", allergens: ["arachide"] } },
      ],
    });
    const refus = raisonRefus(
      avecArachide as never,
      [{ membre: "Zoé", type: "allergy", value: "arachide" }],
      [],
    );
    expect(refus).toContain("Kebbé");
  });

  it("un plat au four est refusé si le foyer n'a pas de four", () => {
    const auFour = recette(KEBBE, "Kebbé au four", { tags: ["four"] });
    expect(raisonRefus(auFour as never, [], [])).toContain("four");
    expect(raisonRefus(auFour as never, [], ["four"])).toBeNull();
  });
});

describe("mettre la fête dans le menu (la famille confirme, le code revérifie)", () => {
  it("remplace le repas de ce créneau par tous les plats, avec leur catégorie, et refait les courses", async () => {
    const resultat = await appliquerFete(SESSION, demande());
    expect(mocks.plannedMealDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["repas-jeudi"] } },
    });
    const { data } = mocks.plannedMealCreateMany.mock.calls[0][0];
    expect(data).toEqual([
      {
        mealPlanId: "menu-1",
        recipeId: HOUMOUS,
        date: JEUDI,
        slot: "lunch",
        servings: 20,
        course: "entrée",
      },
      {
        mealPlanId: "menu-1",
        recipeId: KEBBE,
        date: JEUDI,
        slot: "lunch",
        servings: 20,
        course: "plat",
      },
    ]);
    expect(mocks.genererListe).toHaveBeenCalledWith(SESSION, "menu-1");
    expect(resultat).toEqual({ menuId: "menu-1", plats: 2 });
  });

  it("refuse un menu qui dépasse le budget, sans rien changer", async () => {
    await expect(appliquerFete(SESSION, demande({ budgetFcfa: 15000 }))).rejects.toThrow(
      "5000 FCFA",
    );
    expect(mocks.plannedMealCreateMany).not.toHaveBeenCalled();
  });

  it("refuse si aucun menu ne couvre ce jour", async () => {
    mocks.mealPlanFindMany.mockResolvedValue([]);
    await expect(appliquerFete(SESSION, demande())).rejects.toThrow("Aucun menu");
  });

  it("refuse de remplacer un repas déjà cuisiné", async () => {
    mocks.mealPlanFindMany.mockResolvedValue([
      {
        id: "menu-1",
        status: "active",
        meals: [
          {
            id: "repas-jeudi",
            date: JEUDI,
            slot: "lunch",
            status: "cooked",
            servings: 4,
            leftoverFromId: null,
          },
        ],
      },
    ]);
    await expect(appliquerFete(SESSION, demande())).rejects.toThrow("déjà cuisiné");
    expect(mocks.plannedMealDeleteMany).not.toHaveBeenCalled();
  });

  it("un reste remplacé : le dîner d'origine n'est plus cuisiné en double", async () => {
    const mercredi = new Date("2026-11-11T00:00:00Z");
    mocks.mealPlanFindMany.mockResolvedValue([
      {
        id: "menu-1",
        status: "active",
        meals: [
          {
            id: "diner-mercredi",
            date: mercredi,
            slot: "dinner",
            status: "planned",
            servings: 8,
            leftoverFromId: null,
          },
          {
            id: "reste-jeudi",
            date: JEUDI,
            slot: "lunch",
            status: "planned",
            servings: 4,
            leftoverFromId: "diner-mercredi",
          },
        ],
      },
    ]);
    await appliquerFete(SESSION, demande());
    expect(mocks.plannedMealUpdate).toHaveBeenCalledWith({
      where: { id: "diner-mercredi" },
      data: { servings: 4 },
    });
  });

  it("un brouillon : pas de liste de courses à refaire", async () => {
    mocks.mealPlanFindMany.mockResolvedValue([{ id: "brouillon", status: "draft", meals: [] }]);
    await appliquerFete(SESSION, demande());
    expect(mocks.genererListe).not.toHaveBeenCalled();
  });
});

describe("la semaine ordinaire met les plats de fête de côté", () => {
  it("horsFete ne garde que les repas ordinaires", () => {
    expect(
      horsFete([{ id: "a", course: null }, { id: "b", course: "entrée" }, { id: "c" }]),
    ).toEqual([{ id: "a", course: null }, { id: "c" }]);
  });

  it("un plat de fête ne se remplace pas comme un repas ordinaire", async () => {
    mocks.plannedMealFindFirst.mockResolvedValue({
      id: "plat-fete",
      status: "planned",
      course: "entrée",
      mealPlan: { id: "menu-1", status: "active", meals: [] },
    });
    await expect(remplacerRepas(SESSION, "plat-fete", HOUMOUS)).rejects.toThrow("menu de fête");
  });
});

describe("ce que la famille envoie", () => {
  it("le foyer ne vient jamais du corps de la requête, un plat n'est pas en double", () => {
    expect(feteSchema.safeParse({ ...demande(), householdId: "autre" }).success).toBe(false);
    expect(
      feteSchema.safeParse(
        demande({
          plats: [
            { recetteId: HOUMOUS, categorie: "entrée" },
            { recetteId: HOUMOUS, categorie: "plat" },
          ],
        }),
      ).success,
    ).toBe(false);
  });

  it("une fête est un déjeuner ou un dîner, avec un budget entier", () => {
    expect(feteSchema.safeParse(demande({ creneau: "breakfast" as never })).success).toBe(false);
    expect(feteSchema.safeParse(demande({ budgetFcfa: 1000.5 })).success).toBe(false);
  });
});
