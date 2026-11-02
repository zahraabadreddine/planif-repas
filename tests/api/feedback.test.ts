import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const HOUSEHOLD_ID = "hh-1111-1111-1111-111111111111";
const USER_ID = "usr-1111-1111-1111-111111111111";
const MEAL_PLAN_ID = "mp-1111-1111-1111-111111111111";
const PLANNED_MEAL_ID = "pm-1111-1111-1111-111111111111";
const RECIPE_ID = "rec-1111-1111-1111-111111111111";
const FEEDBACK_ID = "fb-1111-1111-1111-111111111111";

const {
  plannedMealFindUnique,
  mealFeedbackCreate,
  mealFeedbackFindMany,
  recipeFindUnique,
  learnedPreferenceFindFirst,
  learnedPreferenceCreate,
  learnedPreferenceUpdate,
  exigerEcriture,
} = vi.hoisted(() => ({
  plannedMealFindUnique: vi.fn(),
  mealFeedbackCreate: vi.fn(),
  mealFeedbackFindMany: vi.fn(),
  recipeFindUnique: vi.fn(),
  learnedPreferenceFindFirst: vi.fn(),
  learnedPreferenceCreate: vi.fn(),
  learnedPreferenceUpdate: vi.fn(),
  exigerEcriture: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    plannedMeal: { findUnique: plannedMealFindUnique },
    mealFeedback: { create: mealFeedbackCreate, findMany: mealFeedbackFindMany },
    recipe: { findUnique: recipeFindUnique },
    learnedPreference: {
      findFirst: learnedPreferenceFindFirst,
      create: learnedPreferenceCreate,
      update: learnedPreferenceUpdate,
    },
  },
}));
vi.mock("@/lib/auth/garde", () => ({
  exigerSession: exigerEcriture,
  exigerEcriture,
}));

import { POST } from "@/app/api/planned-meals/[id]/feedback/route";
import { donnerRetour } from "@/lib/stock/retour-repas";

const session = {
  userId: USER_ID,
  role: "user" as const,
  householdId: HOUSEHOLD_ID,
  acces: { canWrite: true } as never,
};

function repasValide() {
  return {
    id: PLANNED_MEAL_ID,
    mealPlanId: MEAL_PLAN_ID,
    recipeId: RECIPE_ID,
    status: "cooked",
    mealPlan: { householdId: HOUSEHOLD_ID },
    recipe: { id: RECIPE_ID, title: "Riz sauce tomate" },
  };
}

beforeEach(() => {
  for (const mock of [
    plannedMealFindUnique,
    mealFeedbackCreate,
    mealFeedbackFindMany,
    recipeFindUnique,
    learnedPreferenceFindFirst,
    learnedPreferenceCreate,
    learnedPreferenceUpdate,
    exigerEcriture,
  ]) {
    mock.mockReset();
  }
  exigerEcriture.mockResolvedValue(session);
  mealFeedbackFindMany.mockResolvedValue([]);
});

// ─── donnerRetour ───────────────────────────────────────────────

describe("donnerRetour", () => {
  it("crée un retour sur un repas cuisiné", async () => {
    plannedMealFindUnique.mockResolvedValue(repasValide());
    mealFeedbackCreate.mockResolvedValue({ id: FEEDBACK_ID });

    const resultat = await donnerRetour(session, PLANNED_MEAL_ID, {
      liked: 3,
      leftovers: false,
    });

    expect(resultat.id).toBe(FEEDBACK_ID);
    expect(resultat.recipeName).toBe("Riz sauce tomate");
    expect(resultat.liked).toBe(3);
    expect(resultat.leftovers).toBe(false);
    expect(resultat.learned).toBeNull();
    expect(mealFeedbackCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        plannedMealId: PLANNED_MEAL_ID,
        userId: USER_ID,
        cooked: true,
        liked: 3,
        leftovers: false,
        comment: null,
      }),
    });
  });

  it("accepte un commentaire", async () => {
    plannedMealFindUnique.mockResolvedValue(repasValide());
    mealFeedbackCreate.mockResolvedValue({ id: FEEDBACK_ID });

    const resultat = await donnerRetour(session, PLANNED_MEAL_ID, {
      liked: 2,
      leftovers: true,
      comment: "Trop salé",
    });

    expect(resultat.leftovers).toBe(true);
    expect(mealFeedbackCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ comment: "Trop salé" }),
    });
  });

  it("accepte liked null (pas de note)", async () => {
    plannedMealFindUnique.mockResolvedValue(repasValide());
    mealFeedbackCreate.mockResolvedValue({ id: FEEDBACK_ID });

    const resultat = await donnerRetour(session, PLANNED_MEAL_ID, {
      liked: null,
      leftovers: false,
    });

    expect(resultat.liked).toBeNull();
  });

  it("refuse si le repas n'est pas cuisiné", async () => {
    plannedMealFindUnique.mockResolvedValue({
      ...repasValide(),
      status: "planned",
    });

    await expect(
      donnerRetour(session, PLANNED_MEAL_ID, { liked: 3, leftovers: false }),
    ).rejects.toThrow(ErreurApi);
  });

  it("refuse si le repas n'existe pas", async () => {
    plannedMealFindUnique.mockResolvedValue(null);

    await expect(
      donnerRetour(session, PLANNED_MEAL_ID, { liked: 3, leftovers: false }),
    ).rejects.toThrow(ErreurApi);
  });

  it("refuse si le repas appartient à un autre foyer", async () => {
    plannedMealFindUnique.mockResolvedValue({
      ...repasValide(),
      mealPlan: { householdId: "autre-foyer" },
    });

    await expect(
      donnerRetour(session, PLANNED_MEAL_ID, { liked: 3, leftovers: false }),
    ).rejects.toThrow(ErreurApi);
  });

  it("refuse sans foyer", async () => {
    const sessionSansFoyer = { ...session, householdId: null };

    await expect(
      donnerRetour(sessionSansFoyer as never, PLANNED_MEAL_ID, {
        liked: 3,
        leftovers: false,
      }),
    ).rejects.toThrow(ErreurApi);
  });

  it("déclenche un apprentissage quand un plat est noté 1 deux fois", async () => {
    plannedMealFindUnique.mockResolvedValue(repasValide());
    mealFeedbackCreate.mockResolvedValue({ id: FEEDBACK_ID });
    mealFeedbackFindMany.mockResolvedValue([{ liked: 1 }, { liked: 1 }]);
    recipeFindUnique.mockResolvedValue({ title: "Riz sauce tomate" });
    learnedPreferenceFindFirst.mockResolvedValue(null);

    const resultat = await donnerRetour(session, PLANNED_MEAL_ID, {
      liked: 1,
      leftovers: false,
    });

    expect(resultat.learned).toContain("n'a pas aimé");
    expect(learnedPreferenceCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        householdId: HOUSEHOLD_ID,
        key: `dish:${RECIPE_ID}`,
        value: "disliked",
        source: "meal-feedback",
      }),
    });
  });

  it("déclenche un apprentissage quand un plat est noté 3 deux fois", async () => {
    plannedMealFindUnique.mockResolvedValue(repasValide());
    mealFeedbackCreate.mockResolvedValue({ id: FEEDBACK_ID });
    mealFeedbackFindMany.mockResolvedValue([{ liked: 3 }, { liked: 3 }]);
    recipeFindUnique.mockResolvedValue({ title: "Riz sauce tomate" });
    learnedPreferenceFindFirst.mockResolvedValue(null);

    const resultat = await donnerRetour(session, PLANNED_MEAL_ID, {
      liked: 3,
      leftovers: false,
    });

    expect(resultat.learned).toContain("a aimé");
    expect(learnedPreferenceCreate).toHaveBeenCalled();
  });

  it("met à jour une préférence existante au lieu d'en créer une nouvelle", async () => {
    plannedMealFindUnique.mockResolvedValue(repasValide());
    mealFeedbackCreate.mockResolvedValue({ id: FEEDBACK_ID });
    mealFeedbackFindMany.mockResolvedValue([{ liked: 1 }, { liked: 1 }]);
    recipeFindUnique.mockResolvedValue({ title: "Riz sauce tomate" });
    learnedPreferenceFindFirst.mockResolvedValue({
      id: "pref-existante",
      key: `dish:${RECIPE_ID}`,
      value: "liked",
    });

    await donnerRetour(session, PLANNED_MEAL_ID, {
      liked: 1,
      leftovers: false,
    });

    expect(learnedPreferenceUpdate).toHaveBeenCalledWith({
      where: { id: "pref-existante" },
      data: expect.objectContaining({ value: "disliked", active: true }),
    });
    expect(learnedPreferenceCreate).not.toHaveBeenCalled();
  });

  it("ne déclenche pas d'apprentissage si les notes sont mixtes", async () => {
    plannedMealFindUnique.mockResolvedValue(repasValide());
    mealFeedbackCreate.mockResolvedValue({ id: FEEDBACK_ID });
    mealFeedbackFindMany.mockResolvedValue([{ liked: 3 }, { liked: 1 }]);

    const resultat = await donnerRetour(session, PLANNED_MEAL_ID, {
      liked: 2,
      leftovers: false,
    });

    expect(resultat.learned).toBeNull();
    expect(learnedPreferenceCreate).not.toHaveBeenCalled();
  });
});

// ─── POST /api/planned-meals/:id/feedback ───────────────────────

describe("POST /api/planned-meals/:id/feedback", () => {
  function creerRequete(corps: unknown) {
    return new Request("http://localhost/api/planned-meals/x/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
  }

  it("renvoie 200 avec le retour", async () => {
    plannedMealFindUnique.mockResolvedValue(repasValide());
    mealFeedbackCreate.mockResolvedValue({ id: FEEDBACK_ID });

    const reponse = await POST(
      creerRequete({ liked: 3, leftovers: false }),
      { params: Promise.resolve({ id: PLANNED_MEAL_ID }) },
    );
    const corps = await reponse.json();

    expect(reponse.status).toBe(200);
    expect(corps.recipeName).toBe("Riz sauce tomate");
  });

  it("401 sans session", async () => {
    exigerEcriture.mockRejectedValue(new ErreurApi("NONCONNECTE"));

    const reponse = await POST(
      creerRequete({ liked: 3, leftovers: false }),
      { params: Promise.resolve({ id: PLANNED_MEAL_ID }) },
    );

    expect(reponse.status).toBe(401);
  });

  it("400 avec un corps invalide", async () => {
    const reponse = await POST(
      creerRequete({ liked: 5, leftovers: "oui" }),
      { params: Promise.resolve({ id: PLANNED_MEAL_ID }) },
    );

    expect(reponse.status).toBe(400);
  });

  it("404 si le repas n'existe pas", async () => {
    plannedMealFindUnique.mockResolvedValue(null);

    const reponse = await POST(
      creerRequete({ liked: 2, leftovers: true }),
      { params: Promise.resolve({ id: PLANNED_MEAL_ID }) },
    );

    expect(reponse.status).toBe(404);
  });
});
