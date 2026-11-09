import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { OutilAgent } from "./types";
import { getHouseholdProfile } from "./get-household-profile";
import { getWeekPlan } from "./get-week-plan";
import { getStock } from "./get-stock";
import { searchRecipes } from "./search-recipes";
import { findRecipesFromStock } from "./find-recipes-from-stock";
import { findWhereToBuy } from "./find-where-to-buy";
import { proposeProfileUpdate } from "./propose-profile-update";
import { generateWeekPlan } from "./generate-week-plan";
import { proposeMealChange } from "./propose-meal-change";
import { recordPurchase } from "./record-purchase";
import { planEmergency } from "./plan-emergency";
import { buildShoppingList } from "./build-shopping-list";
import { recordMealFeedback } from "./record-meal-feedback";
import { rememberPreference } from "./remember-preference";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const liste: OutilAgent<any>[] = [
  getHouseholdProfile,
  getWeekPlan,
  getStock,
  searchRecipes,
  findRecipesFromStock,
  findWhereToBuy,
  proposeProfileUpdate,
  generateWeekPlan,
  proposeMealChange,
  recordPurchase,
  planEmergency,
  buildShoppingList,
  recordMealFeedback,
  rememberPreference,
];

export const OUTILS = new Map<string, OutilAgent>(
  liste.map((o) => [o.nom, o]),
);

export function outilsAnthropicSchema(): Anthropic.Messages.Tool[] {
  return liste.map((o) => ({
    name: o.nom,
    description: o.description,
    input_schema: zodVersJsonSchema(o.schema),
  }));
}

function zodVersJsonSchema(schema: z.ZodType): Anthropic.Messages.Tool["input_schema"] {
  const jsonSchema = z.toJSONSchema(schema);
  const { $schema: _, ...reste } = jsonSchema as Record<string, unknown>;
  return reste as Anthropic.Messages.Tool["input_schema"];
}
