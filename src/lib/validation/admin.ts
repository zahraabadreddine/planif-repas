import { z } from "zod";

// Schémas de validation pour les routes d'administration (EF-21, EF-28, ENF-18).

const etape = z.object({
  text: z.string().min(1),
  minutes: z.number().int().min(0),
});

const mealSlot = z.enum(["breakfast", "lunch", "dinner"]);
const recipeSource = z.enum(["team", "ai"]);
const placeType = z.enum(["market", "supermarket", "shop"]);
const priceSource = z.enum(["team", "user", "estimate"]);

export const recetteSchema = z.object({
  title: z.string().trim().min(2).max(120),
  cuisine: z.string().trim().min(2).max(40),
  mealTypes: z.array(mealSlot).min(1),
  prepMinutes: z.number().int().min(0),
  cookMinutes: z.number().int().min(0),
  needsCooking: z.boolean(),
  servings: z.number().int().min(1).max(20),
  difficulty: z.number().int().min(1).max(3),
  tags: z.array(z.string().trim().min(1)).default([]),
  steps: z.array(etape).default([]),
  leftoverIdeas: z.array(z.string().trim().min(1)).default([]),
  source: recipeSource.default("team"),
  validated: z.boolean().default(false),
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string().uuid(),
        unitId: z.string().uuid(),
        quantity: z.number().positive(),
        optional: z.boolean().default(false),
      }),
    )
    .optional(),
});

export type RecetteAdmin = z.infer<typeof recetteSchema>;

export const recetteUpdateSchema = recetteSchema.partial();

export const ingredientSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: z.string().trim().min(1).max(40),
  allergens: z.array(z.string().trim().min(1)).default([]),
  defaultUnitId: z.string().uuid().nullable().default(null),
  shelfLifeDays: z
    .object({
      ambiant: z.number().int().min(0).optional(),
      frigo: z.number().int().min(0).optional(),
      congelateur: z.number().int().min(0).optional(),
    })
    .default({}),
  seasonalMonths: z.array(z.number().int().min(1).max(12)).default([]),
  storageTip: z.string().trim().max(200).nullable().default(null),
});

export type IngredientAdmin = z.infer<typeof ingredientSchema>;

export const prixSchema = z.object({
  ingredientId: z.string().uuid(),
  unitId: z.string().uuid(),
  priceFcfa: z.number().int().positive(),
  placeType,
  storeId: z.string().uuid().nullable().default(null),
  city: z.string().trim().min(1).max(60).default("Abidjan"),
  source: priceSource.default("team"),
  observedAt: z.coerce.date(),
});

export type PrixAdmin = z.infer<typeof prixSchema>;

export const magasinSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: placeType,
  neighborhoodId: z.string().uuid(),
  address: z.string().trim().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  openingHours: z
    .record(z.string(), z.string())
    .nullable()
    .default(null),
});

export type MagasinAdmin = z.infer<typeof magasinSchema>;

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Le nouveau mot de passe doit faire au moins 8 caractères."),
});
