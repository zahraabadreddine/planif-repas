import type Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
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
  return extraireType(schema) as Anthropic.Messages.Tool["input_schema"];
}

function extraireType(schema: z.ZodType): Record<string, unknown> {
  const def = (schema as unknown as { _def: Record<string, unknown> })._def;
  const typeName = def.typeName as string | undefined;

  if (typeName === "ZodObject") {
    const shape = (schema as z.ZodObject<z.ZodRawShape>).shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [cle, val] of Object.entries(shape)) {
      properties[cle] = extraireType(val as z.ZodType);
      if (!estOptionnel(val as z.ZodType)) required.push(cle);
    }
    const result: Record<string, unknown> = { type: "object", properties };
    if (required.length > 0) result.required = required;
    return result;
  }
  if (typeName === "ZodString") {
    const result: Record<string, unknown> = { type: "string" };
    if (def.description) result.description = def.description;
    return result;
  }
  if (typeName === "ZodNumber") {
    const result: Record<string, unknown> = { type: "number" };
    if (def.description) result.description = def.description;
    return result;
  }
  if (typeName === "ZodBoolean") {
    const result: Record<string, unknown> = { type: "boolean" };
    if (def.description) result.description = def.description;
    return result;
  }
  if (typeName === "ZodEnum") {
    const values = (def.values as string[]) ?? [];
    const result: Record<string, unknown> = { type: "string", enum: values };
    if (def.description) result.description = def.description;
    return result;
  }
  if (typeName === "ZodArray") {
    const inner = extraireType(def.type as z.ZodType);
    const result: Record<string, unknown> = { type: "array", items: inner };
    if (def.description) result.description = def.description;
    return result;
  }
  if (typeName === "ZodOptional") {
    const inner = extraireType(def.innerType as z.ZodType);
    if (def.description) inner.description = def.description as string;
    return inner;
  }
  if (typeName === "ZodEffects") {
    return extraireType(def.schema as z.ZodType);
  }
  if (typeName === "ZodNullable") {
    return extraireType(def.innerType as z.ZodType);
  }
  return { type: "object" };
}

function estOptionnel(schema: z.ZodType): boolean {
  const typeName = (schema as unknown as { _def: { typeName?: string } })._def
    .typeName;
  if (typeName === "ZodOptional") return true;
  if (typeName === "ZodEffects") {
    const inner = (schema as unknown as { _def: { schema: z.ZodType } })._def
      .schema;
    return estOptionnel(inner);
  }
  return false;
}
