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
import { proposerIdeeFrigo } from "./proposer-idee-frigo";
import { listerIngredientsPermis } from "./lister-ingredients-permis";
import { proposerIdeePlat } from "./proposer-idee-plat";
import { proposerRepasCuisine } from "./proposer-repas-cuisine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const liste: OutilAgent<any>[] = [
  getHouseholdProfile,
  getWeekPlan,
  getStock,
  searchRecipes,
  findRecipesFromStock,
  proposerIdeeFrigo,
  listerIngredientsPermis,
  proposerIdeePlat,
  proposerRepasCuisine,
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

export const OUTILS = new Map<string, OutilAgent>(liste.map((o) => [o.nom, o]));

export function outilsAnthropicSchema(): Anthropic.Messages.Tool[] {
  return liste.map((o) => ({
    name: o.nom,
    description: o.description,
    input_schema: zodVersJsonSchema(o.schema),
  }));
}

/** Les mêmes outils, sous une forme indépendante du fournisseur (utilisée pour Groq). */
export function definitionsOutils(): {
  nom: string;
  description: string;
  schema: Record<string, unknown>;
}[] {
  return liste.map((o) => ({
    nom: o.nom,
    description: o.description,
    schema: zodVersJsonSchema(o.schema) as Record<string, unknown>,
  }));
}

function zodVersJsonSchema(schema: z.ZodType): Anthropic.Messages.Tool["input_schema"] {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema["$schema"];
  return jsonSchema as Anthropic.Messages.Tool["input_schema"];
}
