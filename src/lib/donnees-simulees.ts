// ⚠️ Données d'exemple pour la maquette front.
// Elles seront remplacées par les appels aux routes API (/api/meal-plans, /api/stock…).

import type {
  ChatMessage,
  DayPlan,
  EmergencyOption,
  Recipe,
  ShoppingBlock,
  StockItem,
} from "./types";

export const household = {
  firstName: "Aminata",
  members: 4,
  restrictions: ["Sans arachide"],
  weeklyBudgetFcfa: 25000,
  spentFcfa: 18400,
  today: "2026-10-13",
  todayLabel: "Mardi 13 octobre",
  weekLabel: "12 – 18 octobre",
};

export const recipes: Recipe[] = [
  {
    id: "attieke-poisson",
    name: "Poisson braisé & attiéké",
    minutes: 40,
    servings: 4,
    costFcfa: 3500,
    difficulty: "Facile",
    colors: { tint: "#8FC1C9", base: "#FDD973", top: "#F47230" },
    ingredients: [
      { name: "Attiéké", quantity: "4 boules", inStock: false },
      { name: "Poisson (carpe ou chinchard)", quantity: "2 pièces", inStock: true },
      { name: "Tomates", quantity: "3", inStock: true },
      { name: "Oignons", quantity: "2", inStock: true },
      { name: "Piment", quantity: "1", inStock: true },
      { name: "Ail & gingembre", quantity: "1 morceau", inStock: false },
      { name: "Huile", quantity: "3 c. à soupe", inStock: true },
    ],
    steps: [
      { text: "Nettoie le poisson et fais trois entailles de chaque côté.", minutes: 5 },
      {
        text: "Écrase l'ail, le gingembre, le piment et un oignon. Frotte le poisson avec ce mélange.",
        minutes: 10,
      },
      {
        text: "Laisse mariner pendant que tu coupes tomates et oignons pour la sauce.",
        minutes: 10,
      },
      { text: "Braise le poisson 8 à 10 minutes de chaque côté, sur feu moyen.", minutes: 20 },
      { text: "Réchauffe l'attiéké à la vapeur et sers avec la sauce et le piment.", minutes: 5 },
    ],
  },
  {
    id: "riz-sauce-tomate",
    name: "Riz sauce tomate",
    minutes: 30,
    servings: 4,
    costFcfa: 1800,
    difficulty: "Facile",
    colors: { tint: "#F29CB0", base: "#FFF4DF", top: "#E2492F" },
    ingredients: [
      { name: "Riz", quantity: "500 g", inStock: true },
      { name: "Tomates", quantity: "1 tas", inStock: true },
      { name: "Oignons", quantity: "2", inStock: true },
      { name: "Huile", quantity: "4 c. à soupe", inStock: true },
    ],
    steps: [
      { text: "Lave le riz et mets-le à cuire.", minutes: 5 },
      {
        text: "Fais revenir les oignons, ajoute les tomates écrasées et laisse mijoter.",
        minutes: 20,
      },
      { text: "Sale, goûte et sers la sauce sur le riz.", minutes: 5 },
    ],
  },
  {
    id: "alloco-oeufs",
    name: "Alloco & œufs",
    minutes: 20,
    servings: 4,
    costFcfa: 1500,
    difficulty: "Facile",
    colors: { tint: "#FDD973", base: "#F9A11B", top: "#FFF4DF" },
    ingredients: [
      { name: "Banane plantain mûre", quantity: "4 doigts", inStock: false },
      { name: "Œufs", quantity: "4", inStock: true },
      { name: "Huile", quantity: "pour friture", inStock: true },
    ],
    steps: [
      { text: "Épluche et coupe la banane en rondelles.", minutes: 5 },
      { text: "Fais frire jusqu'à ce qu'elles soient bien dorées.", minutes: 10 },
      { text: "Prépare les œufs au plat et sers avec du piment.", minutes: 5 },
    ],
  },
  {
    id: "sauce-graine",
    name: "Sauce graine & riz",
    minutes: 45,
    servings: 4,
    costFcfa: 2800,
    difficulty: "Moyen",
    colors: { tint: "#F47230", base: "#FFF4DF", top: "#9F350B" },
    ingredients: [
      { name: "Graine de palme", quantity: "1 boîte", inStock: false },
      { name: "Poisson fumé", quantity: "1 pièce", inStock: false },
      { name: "Riz", quantity: "500 g", inStock: true },
      { name: "Oignons", quantity: "1", inStock: true },
    ],
    steps: [
      { text: "Fais chauffer la graine avec un peu d'eau.", minutes: 10 },
      { text: "Ajoute le poisson fumé et l'oignon, laisse mijoter.", minutes: 30 },
      { text: "Sers chaud avec le riz.", minutes: 5 },
    ],
  },
  {
    id: "riz-gras-poulet",
    name: "Riz gras au poulet",
    minutes: 50,
    servings: 4,
    costFcfa: 3200,
    difficulty: "Moyen",
    colors: { tint: "#8FC1C9", base: "#F9A11B", top: "#9F350B" },
    ingredients: [
      { name: "Poulet", quantity: "1/2", inStock: false },
      { name: "Riz", quantity: "500 g", inStock: true },
      { name: "Tomates", quantity: "1 tas", inStock: true },
    ],
    steps: [
      { text: "Fais dorer le poulet découpé.", minutes: 15 },
      { text: "Ajoute tomates et oignons, puis le riz et l'eau.", minutes: 10 },
      { text: "Laisse cuire à couvert jusqu'à absorption.", minutes: 25 },
    ],
  },
  {
    id: "spaghetti-sautes",
    name: "Spaghetti sautés tomate",
    minutes: 15,
    servings: 4,
    costFcfa: 1200,
    difficulty: "Facile",
    colors: { tint: "#FDD973", base: "#FDD973", top: "#E2492F" },
    ingredients: [
      { name: "Spaghetti", quantity: "1 paquet", inStock: true },
      { name: "Tomates", quantity: "3", inStock: true },
      { name: "Oignons", quantity: "1", inStock: true },
    ],
    steps: [
      { text: "Fais cuire les spaghetti.", minutes: 8 },
      { text: "Saute-les dans la poêle avec tomates et oignons.", minutes: 7 },
    ],
  },
  {
    id: "garba",
    name: "Garba maison",
    minutes: 30,
    servings: 4,
    costFcfa: 2000,
    difficulty: "Facile",
    colors: { tint: "#F29CB0", base: "#FDD973", top: "#8FC1C9" },
    ingredients: [
      { name: "Attiéké", quantity: "4 boules", inStock: false },
      { name: "Thon", quantity: "2 tranches", inStock: false },
      { name: "Piment & oignon", quantity: "1 tas", inStock: true },
    ],
    steps: [
      { text: "Fais frire le thon.", minutes: 15 },
      { text: "Coupe piment et oignon finement.", minutes: 10 },
      { text: "Sers avec l'attiéké et un filet d'huile de friture.", minutes: 5 },
    ],
  },
  {
    id: "riz-saute-aubergines",
    name: "Riz sauté œufs & aubergines",
    minutes: 20,
    servings: 4,
    costFcfa: 1900,
    difficulty: "Facile",
    colors: { tint: "#FDD973", base: "#FFF4DF", top: "#5B2A4E" },
    ingredients: [
      { name: "Riz cuit", quantity: "4 bols", inStock: true },
      { name: "Œufs", quantity: "4", inStock: true },
      { name: "Aubergines", quantity: "3", inStock: true },
      { name: "Oignons", quantity: "1", inStock: true },
    ],
    steps: [
      { text: "Coupe les aubergines en dés et fais-les dorer.", minutes: 8 },
      { text: "Ajoute l'oignon et le riz, fais sauter à feu vif.", minutes: 7 },
      { text: "Casse les œufs dans la poêle et mélange jusqu'à cuisson.", minutes: 5 },
    ],
  },
  {
    id: "kedjenou",
    name: "Kédjénou de poulet",
    minutes: 60,
    servings: 4,
    costFcfa: 3800,
    difficulty: "Moyen",
    colors: { tint: "#F47230", base: "#FFF4DF", top: "#F9A11B" },
    ingredients: [
      { name: "Poulet", quantity: "1", inStock: false },
      { name: "Tomates", quantity: "1 tas", inStock: true },
      { name: "Aubergines", quantity: "2", inStock: true },
    ],
    steps: [
      { text: "Mets le poulet et les légumes dans la canari ou la marmite.", minutes: 10 },
      {
        text: "Ferme bien et laisse cuire à l'étouffée en secouant de temps en temps.",
        minutes: 50,
      },
    ],
  },
  {
    id: "pain-omelette",
    name: "Pain & omelette",
    minutes: 10,
    servings: 4,
    costFcfa: 900,
    difficulty: "Facile",
    colors: { tint: "#8FC1C9", base: "#F9A11B", top: "#FDD973" },
    ingredients: [
      { name: "Œufs", quantity: "6", inStock: true },
      { name: "Pain", quantity: "2 baguettes", inStock: false },
      { name: "Oignons", quantity: "1", inStock: true },
    ],
    steps: [
      { text: "Bats les œufs avec l'oignon coupé.", minutes: 3 },
      { text: "Fais cuire l'omelette et sers dans le pain.", minutes: 7 },
    ],
  },
  {
    id: "foutou-sauce-claire",
    name: "Foutou & sauce claire",
    minutes: 70,
    servings: 4,
    costFcfa: 3600,
    difficulty: "Moyen",
    colors: { tint: "#FDD973", base: "#FFF4DF", top: "#F47230" },
    ingredients: [
      { name: "Banane plantain", quantity: "8 doigts", inStock: false },
      { name: "Poisson", quantity: "2 pièces", inStock: true },
      { name: "Gombo", quantity: "1 tas", inStock: true },
    ],
    steps: [
      { text: "Prépare la sauce claire avec le poisson et le gombo.", minutes: 40 },
      { text: "Cuis et pile la banane pour le foutou.", minutes: 30 },
    ],
  },
  {
    id: "alloco-poisson",
    name: "Alloco & poisson frit",
    minutes: 30,
    servings: 4,
    costFcfa: 2200,
    difficulty: "Facile",
    colors: { tint: "#F29CB0", base: "#F9A11B", top: "#8FC1C9" },
    ingredients: [
      { name: "Banane plantain", quantity: "4 doigts", inStock: false },
      { name: "Poisson", quantity: "2 pièces", inStock: true },
    ],
    steps: [
      { text: "Fais frire le poisson assaisonné.", minutes: 15 },
      { text: "Fais frire l'alloco et sers ensemble.", minutes: 15 },
    ],
  },
  {
    id: "poulet-braise",
    name: "Poulet braisé & attiéké",
    minutes: 60,
    servings: 4,
    costFcfa: 4200,
    difficulty: "Moyen",
    colors: { tint: "#F47230", base: "#FDD973", top: "#9F350B" },
    ingredients: [
      { name: "Poulet", quantity: "1", inStock: false },
      { name: "Attiéké", quantity: "4 boules", inStock: false },
    ],
    steps: [
      { text: "Marine le poulet avec ail, gingembre et piment.", minutes: 20 },
      { text: "Braise-le en le retournant souvent.", minutes: 40 },
    ],
  },
  {
    id: "soupe-legumes",
    name: "Soupe de légumes",
    minutes: 35,
    servings: 4,
    costFcfa: 1500,
    difficulty: "Facile",
    colors: { tint: "#8FC1C9", base: "#FFF4DF", top: "#344F30" },
    ingredients: [
      { name: "Légumes variés", quantity: "2 tas", inStock: false },
      { name: "Oignons", quantity: "1", inStock: true },
    ],
    steps: [
      { text: "Coupe les légumes en morceaux.", minutes: 10 },
      { text: "Fais-les cuire dans l'eau salée puis mixe ou écrase.", minutes: 25 },
    ],
  },
  {
    id: "omelette-oignons",
    name: "Omelette oignons & pain",
    minutes: 10,
    servings: 4,
    costFcfa: 900,
    difficulty: "Facile",
    colors: { tint: "#FDD973", base: "#F9A11B", top: "#FDD973" },
    ingredients: [
      { name: "Œufs", quantity: "6", inStock: true },
      { name: "Oignons", quantity: "2", inStock: true },
      { name: "Pain", quantity: "1 baguette", inStock: true },
    ],
    steps: [
      { text: "Émince les oignons et fais-les revenir.", minutes: 4 },
      { text: "Verse les œufs battus, cuis et sers avec le pain.", minutes: 6 },
    ],
  },
];

export function getRecipe(id: string): Recipe | undefined {
  return recipes.find((r) => r.id === id);
}

export const weekPlan: DayPlan[] = [
  {
    date: "2026-10-12",
    short: "LUN",
    label: "Lundi",
    meals: [
      { slot: "lunch", recipeId: "attieke-poisson" },
      { slot: "dinner", recipeId: "riz-sauce-tomate" },
    ],
  },
  {
    date: "2026-10-13",
    short: "MAR",
    label: "Mardi, c'est aujourd'hui",
    meals: [
      { slot: "lunch", recipeId: "alloco-oeufs", tag: "vite fait" },
      { slot: "dinner", recipeId: "sauce-graine" },
    ],
  },
  {
    date: "2026-10-14",
    short: "MER",
    label: "Mercredi",
    meals: [
      { slot: "lunch", recipeId: "riz-gras-poulet" },
      { slot: "dinner", recipeId: "spaghetti-sautes", tag: "vite fait" },
    ],
  },
  {
    date: "2026-10-15",
    short: "JEU",
    label: "Jeudi",
    meals: [
      { slot: "lunch", recipeId: "garba" },
      { slot: "dinner", recipeId: "riz-saute-aubergines", tag: "tes aubergines" },
    ],
  },
  {
    date: "2026-10-16",
    short: "VEN",
    label: "Vendredi",
    meals: [
      { slot: "lunch", recipeId: "kedjenou" },
      { slot: "dinner", recipeId: "pain-omelette", tag: "vite fait" },
    ],
  },
  {
    date: "2026-10-17",
    short: "SAM",
    label: "Samedi",
    meals: [
      { slot: "lunch", recipeId: "foutou-sauce-claire" },
      { slot: "dinner", recipeId: "alloco-poisson" },
    ],
  },
  {
    date: "2026-10-18",
    short: "DIM",
    label: "Dimanche",
    meals: [
      { slot: "lunch", recipeId: "poulet-braise", tag: "en famille" },
      { slot: "dinner", recipeId: "soupe-legumes" },
    ],
  },
];

export const shoppingList: ShoppingBlock[] = [
  {
    kind: "market",
    title: "au marché",
    store: "Marché d'Adjamé",
    distance: "1,2 km",
    mapsQuery: "Marché d'Adjamé Abidjan",
    items: [
      { id: "tom", name: "Tomates", quantity: "2 tas", priceFcfa: 500 },
      { id: "gom", name: "Gombo", quantity: "1 tas", priceFcfa: 300 },
      { id: "ban", name: "Plantain", quantity: "6 doigts", priceFcfa: 1200 },
      { id: "poi", name: "Chinchard", quantity: "2 pièces", priceFcfa: 2000 },
    ],
  },
  {
    kind: "supermarket",
    title: "au supermarché",
    store: "Supermarché du quartier",
    distance: "800 m",
    mapsQuery: "supermarché Cocody Abidjan",
    items: [
      { id: "riz", name: "Riz parfumé", quantity: "5 kg", priceFcfa: 4500 },
      { id: "hui", name: "Huile", quantity: "1 L", priceFcfa: 1400 },
    ],
  },
  {
    kind: "shop",
    title: "chez le boutiquier",
    store: "Boutique du coin",
    distance: "150 m",
    mapsQuery: "boutique Cocody Abidjan",
    items: [
      { id: "oeu", name: "Œufs", quantity: "1 plaquette", priceFcfa: 2700 },
      { id: "pai", name: "Pain", quantity: "2 baguettes", priceFcfa: 300 },
    ],
  },
];

export const stock: StockItem[] = [
  { id: "s1", name: "Poisson", quantity: "2 pièces", icon: "poisson", expiresInDays: 1 },
  { id: "s2", name: "Aubergines", quantity: "3", icon: "aubergine", expiresInDays: 2 },
  { id: "s3", name: "Gombo", quantity: "1 tas", icon: "gombo", expiresInDays: 3 },
  { id: "s4", name: "Riz", quantity: "3 kg", icon: "riz" },
  { id: "s5", name: "Huile", quantity: "1 L", icon: "huile" },
  { id: "s6", name: "Oignons", quantity: "6", icon: "oignon" },
  { id: "s7", name: "Œufs", quantity: "8", icon: "oeuf", expiresInDays: 12 },
  { id: "s8", name: "Tomates", quantity: "1 tas", icon: "tomate", expiresInDays: 5 },
  { id: "s9", name: "Piment", quantity: "1 tas", icon: "piment", expiresInDays: 6 },
];

export const initialChat: ChatMessage[] = [
  {
    id: "m1",
    from: "agent",
    kind: "text",
    text: "Bonsoir Aminata ! Ce soir c'est sauce graine. On regarde la suite de la semaine ?",
  },
  { id: "m2", from: "user", kind: "text", text: "Jeudi je rentre tard, j'aurai 20 minutes." },
  {
    id: "m3",
    from: "agent",
    kind: "text",
    text: "Pas de souci. Le kédjénou passe à vendredi, et pour jeudi soir je te propose ça :",
  },
  {
    id: "m4",
    from: "agent",
    kind: "proposal",
    proposal: {
      id: "p1",
      label: "jeudi soir",
      title: "Riz sauté œufs & aubergines",
      recipeId: "riz-saute-aubergines",
      summary: "20 min · 1 900 F · avec tes aubergines",
      status: "pending",
    },
  },
];

export const chatSuggestions = ["Vider le frigo", "Moins cher", "Une idée pour dimanche"];

export const emergencyOptions: EmergencyOption[] = [
  {
    recipeId: "omelette-oignons",
    name: "Omelette aux oignons & pain",
    short: "l'omelette",
    minutes: 10,
    uses: "œufs, oignons, pain",
  },
  {
    recipeId: "spaghetti-sautes",
    name: "Spaghetti sautés à la tomate",
    short: "les spaghetti",
    minutes: 15,
    uses: "pâtes, tomates, oignons",
  },
  {
    recipeId: "riz-saute-aubergines",
    name: "Riz sauté œufs & aubergines",
    short: "le riz sauté",
    minutes: 15,
    uses: "riz de midi, œufs, aubergines",
  },
];
