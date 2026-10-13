// Types partagés par l'interface.
// Ils suivent le modèle du cahier des charges (Recipe, PlannedMeal, StockItem…)
// pour que le branchement au backend soit simple plus tard.

export type MealSlot = "lunch" | "dinner";

/** Couleurs utilisées par l'illustration d'assiette */
export type PlateColors = {
  tint: string; // fond de la vignette
  base: string; // accompagnement (riz, attiéké…)
  top: string; // sauce / poisson / viande
};

export type Recipe = {
  id: string;
  name: string;
  minutes: number;
  servings: number;
  costFcfa: number;
  difficulty: "Facile" | "Moyen";
  colors: PlateColors;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

export type RecipeIngredient = {
  name: string;
  quantity: string; // en unités du marché : tas, boule, pièce…
  inStock: boolean;
};

export type RecipeStep = {
  text: string;
  minutes: number;
};

export type PlannedMeal = {
  slot: MealSlot;
  recipeId: string;
  tag?: string;
};

export type DayPlan = {
  date: string; // ISO yyyy-mm-dd
  short: string; // LUN, MAR…
  label: string; // Lundi 12 oct.
  meals: PlannedMeal[];
};

export type StoreKind = "market" | "supermarket" | "shop";

export type ShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  priceFcfa: number;
};

export type ShoppingBlock = {
  kind: StoreKind;
  title: string;
  store: string;
  distance: string;
  mapsQuery: string;
  items: ShoppingItem[];
};

export type StockIcon =
  "riz" | "huile" | "oignon" | "oeuf" | "tomate" | "piment" | "poisson" | "aubergine" | "gombo";

export type StockItem = {
  id: string;
  name: string;
  quantity: string;
  icon: StockIcon;
  /** nombre de jours estimés avant que le produit s'abîme (undefined = longue conservation) */
  expiresInDays?: number;
};

export type ChatMessage =
  | { id: string; from: "agent" | "user"; kind: "text"; text: string }
  | { id: string; from: "agent"; kind: "proposal"; proposal: AgentProposal };

export type AgentProposal = {
  id: string;
  title: string;
  label: string; // ex : jeudi soir
  recipeId: string;
  summary: string;
  status: "pending" | "accepted" | "rejected";
};

export type EmergencyOption = {
  recipeId: string;
  name: string;
  short: string; // « l'omelette », pour le bouton de confirmation
  minutes: number;
  uses: string;
};
