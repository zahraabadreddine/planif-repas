// Données de départ du catalogue : unités du marché, ingrédients, prix de l'équipe et recettes.
// Ce fichier ne contient que des données ; prisma/seed.ts les écrit dans la base.
//
// Prix : estimations de l'équipe pour Abidjan (octobre 2026), en FCFA entiers,
// à confirmer avec les relevés du questionnaire.
// Saisons : toute l'année par défaut, à affiner avec le questionnaire.
// Allergènes : les 14 allergènes majeurs, mêmes valeurs que ALLERGENES dans
// src/lib/validation/membre.ts (arachide, fruits-a-coque, lait, oeuf, poisson, crustaces,
// mollusques, gluten, soja, sesame, celeri, moutarde, sulfites, lupin).
// Catégorie « porc » : permet d'écarter ces ingrédients pour un régime sans porc.

import type { MealSlot, PlaceType } from "@prisma/client";

export type UniteDepart = { label: string; grams: number };

export type PrixDepart = {
  unit: string;
  priceFcfa: number;
  placeType: PlaceType;
  // team : prix réellement relevé (source publiée) ; estimate : estimation de l'équipe
  source: "team" | "estimate";
  // Date du relevé ou de l'estimation (AAAA-MM-JJ)
  observedAt: string;
  reference: string;
};

/** Estimations de l'équipe : utilisées seulement à défaut de relevé récent (CLAUDE.md §11). */
const estime = {
  source: "estimate",
  observedAt: "2026-10-14",
  reference: "Estimation de l'équipe (octobre 2026), à remplacer par des relevés",
} as const;

export type Conservation = {
  ambiant: number | null;
  frigo: number | null;
  congelateur: number | null;
};

export type IngredientDepart = {
  name: string;
  category: string;
  allergens: string[];
  shelfLifeDays: Conservation;
  seasonalMonths: number[];
  storageTip?: string;
  units: UniteDepart[];
  defaultUnit: string;
  prices: PrixDepart[];
};

export type LigneRecette = { name: string; quantity: number; unit: string; optional?: boolean };

export type EtapeRecette = { text: string; minutes: number };

export type RecetteDepart = {
  title: string;
  // false tant qu'une cuisinière d'origine n'a pas relu la recette : elle n'est pas proposée
  validated: boolean;
  cuisine: string;
  mealTypes: MealSlot[];
  prepMinutes: number;
  cookMinutes: number;
  needsCooking: boolean;
  servings: number;
  difficulty: 1 | 2 | 3;
  tags: string[];
  // Source de la recette, ou « à valider » quand aucune source signée n'a été trouvée
  reference: string;
  ingredients: LigneRecette[];
  steps: EtapeRecette[];
  leftoverIdeas: string[];
};

const toutLAnnee = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Durées de conservation en jours ; null quand ce rangement ne convient pas. */
function conservation(
  ambiant: number | null,
  frigo: number | null,
  congelateur: number | null,
): Conservation {
  return { ambiant, frigo, congelateur };
}

/** Unités communes à tous les ingrédients (ingrédient vide dans MarketUnit). */
export const unitesGeneriques: UniteDepart[] = [
  { label: "g", grams: 1 },
  { label: "kg", grams: 1000 },
  { label: "ml", grams: 1 },
  { label: "l", grams: 1000 },
  { label: "c. à soupe", grams: 15 },
  { label: "c. à café", grams: 5 },
];

export const ingredientsDepart: IngredientDepart[] = [
  // Féculents et céréales
  {
    name: "Attiéké",
    category: "féculent",
    allergens: [],
    shelfLifeDays: conservation(2, 4, 30),
    seasonalMonths: toutLAnnee,
    storageTip: "Garder la boule bien fermée ; réchauffer à la vapeur avec un peu d'eau.",
    units: [{ label: "boule", grams: 200 }],
    defaultUnit: "boule",
    prices: [
      { unit: "boule", priceFcfa: 100, placeType: "market", ...estime },
      { unit: "boule", priceFcfa: 150, placeType: "shop", ...estime },
      { unit: "kg", priceFcfa: 1000, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Pâte de manioc fermentée",
    category: "féculent",
    allergens: [],
    shelfLifeDays: conservation(3, 7, 60),
    seasonalMonths: toutLAnnee,
    units: [{ label: "boule", grams: 500 }],
    defaultUnit: "boule",
    prices: [{ unit: "boule", priceFcfa: 200, placeType: "market", ...estime }],
  },
  {
    name: "Banane plantain",
    category: "féculent",
    allergens: [],
    shelfLifeDays: conservation(5, null, 60),
    seasonalMonths: toutLAnnee,
    storageTip: "Pour l'alloco, attendre que la peau soit presque noire.",
    units: [{ label: "doigt", grams: 250 }],
    defaultUnit: "doigt",
    prices: [
      { unit: "doigt", priceFcfa: 150, placeType: "market", ...estime },
      { unit: "kg", priceFcfa: 800, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Riz",
    category: "féculent",
    allergens: [],
    shelfLifeDays: conservation(365, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "sac de 5 kg", grams: 5000 }],
    defaultUnit: "kg",
    prices: [
      { unit: "kg", priceFcfa: 600, placeType: "market", ...estime },
      { unit: "kg", priceFcfa: 650, placeType: "shop", ...estime },
      { unit: "sac de 5 kg", priceFcfa: 3500, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Spaghetti",
    category: "féculent",
    allergens: ["gluten"],
    shelfLifeDays: conservation(365, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "paquet de 500 g", grams: 500 }],
    defaultUnit: "paquet de 500 g",
    prices: [
      { unit: "paquet de 500 g", priceFcfa: 400, placeType: "market", ...estime },
      { unit: "paquet de 500 g", priceFcfa: 400, placeType: "shop", ...estime },
      { unit: "paquet de 500 g", priceFcfa: 500, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Farine de blé",
    category: "féculent",
    allergens: ["gluten"],
    shelfLifeDays: conservation(180, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "sachet de 1 kg", grams: 1000 }],
    defaultUnit: "sachet de 1 kg",
    prices: [
      { unit: "kg", priceFcfa: 600, placeType: "market", ...estime },
      { unit: "sachet de 1 kg", priceFcfa: 700, placeType: "shop", ...estime },
      { unit: "sachet de 1 kg", priceFcfa: 800, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Baguette",
    category: "pain",
    allergens: ["gluten"],
    shelfLifeDays: conservation(1, null, 30),
    seasonalMonths: toutLAnnee,
    units: [{ label: "pièce", grams: 200 }],
    defaultUnit: "pièce",
    prices: [
      { unit: "pièce", priceFcfa: 200, placeType: "shop", ...estime },
      { unit: "pièce", priceFcfa: 200, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Pain libanais",
    category: "pain",
    allergens: ["gluten"],
    shelfLifeDays: conservation(2, null, 60),
    seasonalMonths: toutLAnnee,
    units: [{ label: "paquet de 5", grams: 400 }],
    defaultUnit: "paquet de 5",
    prices: [
      { unit: "paquet de 5", priceFcfa: 750, placeType: "shop", ...estime },
      { unit: "paquet de 5", priceFcfa: 800, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Boulgour fin",
    category: "féculent",
    allergens: ["gluten"],
    shelfLifeDays: conservation(365, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "sachet de 500 g", grams: 500 }],
    defaultUnit: "sachet de 500 g",
    prices: [{ unit: "sachet de 500 g", priceFcfa: 1500, placeType: "supermarket", ...estime }],
  },
  {
    name: "Semoule de couscous",
    category: "féculent",
    allergens: ["gluten"],
    shelfLifeDays: conservation(365, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "sachet de 1 kg", grams: 1000 }],
    defaultUnit: "sachet de 1 kg",
    prices: [
      { unit: "sachet de 1 kg", priceFcfa: 1500, placeType: "shop", ...estime },
      { unit: "sachet de 1 kg", priceFcfa: 1500, placeType: "supermarket", ...estime },
    ],
  },

  // Légumineuses
  {
    name: "Pois chiches secs",
    category: "légumineuse",
    allergens: [],
    shelfLifeDays: conservation(365, null, null),
    seasonalMonths: toutLAnnee,
    storageTip: "Les faire tremper la veille dans beaucoup d'eau.",
    units: [{ label: "sachet de 500 g", grams: 500 }],
    defaultUnit: "sachet de 500 g",
    prices: [{ unit: "sachet de 500 g", priceFcfa: 1200, placeType: "supermarket", ...estime }],
  },
  {
    name: "Lentilles vertes",
    category: "légumineuse",
    allergens: [],
    shelfLifeDays: conservation(365, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "sachet de 500 g", grams: 500 }],
    defaultUnit: "sachet de 500 g",
    prices: [
      { unit: "kg", priceFcfa: 1800, placeType: "market", ...estime },
      { unit: "sachet de 500 g", priceFcfa: 1000, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Pois d'Angole cassés (toor dal)",
    category: "légumineuse",
    allergens: [],
    shelfLifeDays: conservation(365, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "sachet de 500 g", grams: 500 }],
    defaultUnit: "sachet de 500 g",
    prices: [{ unit: "sachet de 500 g", priceFcfa: 1500, placeType: "supermarket", ...estime }],
  },
  {
    name: "Haricots urad cassés (urad dal)",
    category: "légumineuse",
    allergens: [],
    shelfLifeDays: conservation(365, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "sachet de 500 g", grams: 500 }],
    defaultUnit: "sachet de 500 g",
    prices: [{ unit: "sachet de 500 g", priceFcfa: 1500, placeType: "supermarket", ...estime }],
  },
  {
    name: "Petits pois en boîte",
    category: "légumineuse",
    allergens: [],
    shelfLifeDays: conservation(730, 2, null),
    seasonalMonths: toutLAnnee,
    storageTip: "Une fois la boîte ouverte, transvaser et garder au frigo.",
    units: [{ label: "boîte de 400 g", grams: 400 }],
    defaultUnit: "boîte de 400 g",
    prices: [
      { unit: "boîte de 400 g", priceFcfa: 850, placeType: "shop", ...estime },
      { unit: "boîte de 400 g", priceFcfa: 800, placeType: "supermarket", ...estime },
    ],
  },

  // Poissons, viandes et œufs
  {
    name: "Thon frais",
    category: "poisson",
    allergens: ["poisson"],
    shelfLifeDays: conservation(null, 2, 90),
    seasonalMonths: toutLAnnee,
    units: [{ label: "tranche", grams: 200 }],
    defaultUnit: "tranche",
    prices: [
      { unit: "kg", priceFcfa: 3000, placeType: "market", ...estime },
      { unit: "kg", priceFcfa: 4500, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Carpe",
    category: "poisson",
    allergens: ["poisson"],
    shelfLifeDays: conservation(null, 2, 90),
    seasonalMonths: toutLAnnee,
    units: [{ label: "pièce", grams: 500 }],
    defaultUnit: "pièce",
    prices: [
      { unit: "pièce", priceFcfa: 1500, placeType: "market", ...estime },
      { unit: "kg", priceFcfa: 3500, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Poisson fumé",
    category: "poisson",
    allergens: ["poisson"],
    shelfLifeDays: conservation(5, 14, 90),
    seasonalMonths: toutLAnnee,
    units: [{ label: "morceau", grams: 150 }],
    defaultUnit: "morceau",
    prices: [{ unit: "morceau", priceFcfa: 500, placeType: "market", ...estime }],
  },
  {
    name: "Thon en boîte",
    category: "poisson",
    allergens: ["poisson"],
    shelfLifeDays: conservation(1000, 2, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "boîte de 160 g", grams: 160 }],
    defaultUnit: "boîte de 160 g",
    prices: [
      { unit: "boîte de 160 g", priceFcfa: 650, placeType: "market", ...estime },
      { unit: "boîte de 160 g", priceFcfa: 700, placeType: "shop", ...estime },
      { unit: "boîte de 160 g", priceFcfa: 800, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Crevettes",
    category: "fruits de mer",
    allergens: ["crustaces"],
    shelfLifeDays: conservation(null, 1, 90),
    seasonalMonths: toutLAnnee,
    units: [{ label: "tas", grams: 250 }],
    defaultUnit: "tas",
    prices: [
      { unit: "tas", priceFcfa: 1500, placeType: "market", ...estime },
      { unit: "kg", priceFcfa: 7000, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Poulet",
    category: "volaille",
    allergens: [],
    shelfLifeDays: conservation(null, 2, 180),
    seasonalMonths: toutLAnnee,
    units: [{ label: "poulet entier", grams: 1500 }],
    defaultUnit: "poulet entier",
    prices: [
      { unit: "poulet entier", priceFcfa: 3500, placeType: "market", ...estime },
      { unit: "kg", priceFcfa: 2800, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Bœuf haché",
    category: "viande",
    allergens: [],
    shelfLifeDays: conservation(null, 1, 90),
    seasonalMonths: toutLAnnee,
    units: [{ label: "barquette de 500 g", grams: 500 }],
    defaultUnit: "barquette de 500 g",
    prices: [
      { unit: "kg", priceFcfa: 3500, placeType: "market", ...estime },
      { unit: "barquette de 500 g", priceFcfa: 2800, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Poitrine de porc fraîche",
    category: "porc",
    allergens: [],
    shelfLifeDays: conservation(null, 3, 90),
    seasonalMonths: toutLAnnee,
    units: [{ label: "morceau", grams: 250 }],
    defaultUnit: "morceau",
    prices: [{ unit: "kg", priceFcfa: 4500, placeType: "supermarket", ...estime }],
  },
  {
    name: "Jambon cuit",
    category: "porc",
    allergens: [],
    shelfLifeDays: conservation(null, 5, 60),
    seasonalMonths: toutLAnnee,
    units: [{ label: "paquet de 4 tranches", grams: 160 }],
    defaultUnit: "paquet de 4 tranches",
    prices: [
      { unit: "paquet de 4 tranches", priceFcfa: 1800, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Œufs",
    category: "œufs",
    allergens: ["oeuf"],
    shelfLifeDays: conservation(14, 28, null),
    seasonalMonths: toutLAnnee,
    units: [
      { label: "pièce", grams: 55 },
      { label: "plateau de 30", grams: 1650 },
    ],
    defaultUnit: "pièce",
    prices: [
      { unit: "pièce", priceFcfa: 90, placeType: "market", ...estime },
      { unit: "pièce", priceFcfa: 100, placeType: "shop", ...estime },
      { unit: "plateau de 30", priceFcfa: 2500, placeType: "market", ...estime },
      { unit: "plateau de 30", priceFcfa: 2700, placeType: "supermarket", ...estime },
    ],
  },

  // Produits laitiers
  {
    name: "Lait",
    category: "produit laitier",
    allergens: ["lait"],
    shelfLifeDays: conservation(90, 3, null),
    seasonalMonths: toutLAnnee,
    storageTip: "Brique fermée au placard ; une fois ouverte, au frigo et à finir en 3 jours.",
    units: [{ label: "brique de 1 l", grams: 1000 }],
    defaultUnit: "brique de 1 l",
    prices: [
      { unit: "brique de 1 l", priceFcfa: 950, placeType: "shop", ...estime },
      { unit: "brique de 1 l", priceFcfa: 1000, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Beurre",
    category: "produit laitier",
    allergens: ["lait"],
    shelfLifeDays: conservation(null, 30, 180),
    seasonalMonths: toutLAnnee,
    units: [{ label: "plaquette de 250 g", grams: 250 }],
    defaultUnit: "plaquette de 250 g",
    prices: [
      { unit: "plaquette de 250 g", priceFcfa: 2300, placeType: "shop", ...estime },
      { unit: "plaquette de 250 g", priceFcfa: 2200, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Ghee",
    category: "produit laitier",
    allergens: ["lait"],
    shelfLifeDays: conservation(90, 180, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "pot de 500 g", grams: 500 }],
    defaultUnit: "pot de 500 g",
    prices: [{ unit: "pot de 500 g", priceFcfa: 5000, placeType: "supermarket", ...estime }],
  },

  // Légumes
  {
    name: "Tomate",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(4, 7, 60),
    seasonalMonths: toutLAnnee,
    storageTip: "Hors du frigo tant qu'elles ne sont pas trop mûres.",
    units: [
      { label: "tas", grams: 500 },
      { label: "pièce", grams: 100 },
    ],
    defaultUnit: "tas",
    prices: [
      { unit: "tas", priceFcfa: 500, placeType: "market", ...estime },
      { unit: "kg", priceFcfa: 1200, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Tomates pelées en boîte",
    category: "conserve",
    allergens: [],
    shelfLifeDays: conservation(730, 3, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "boîte de 400 g", grams: 400 }],
    defaultUnit: "boîte de 400 g",
    prices: [
      { unit: "boîte de 400 g", priceFcfa: 800, placeType: "shop", ...estime },
      { unit: "boîte de 400 g", priceFcfa: 750, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Concentré de tomate",
    category: "conserve",
    allergens: [],
    shelfLifeDays: conservation(730, 7, null),
    seasonalMonths: toutLAnnee,
    units: [
      { label: "boîte de 70 g", grams: 70 },
      { label: "boîte de 400 g", grams: 400 },
    ],
    defaultUnit: "boîte de 70 g",
    prices: [
      { unit: "boîte de 70 g", priceFcfa: 100, placeType: "market", ...estime },
      { unit: "boîte de 70 g", priceFcfa: 100, placeType: "shop", ...estime },
      { unit: "boîte de 400 g", priceFcfa: 900, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Oignon",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(30, 60, null),
    seasonalMonths: toutLAnnee,
    units: [
      { label: "tas", grams: 500 },
      { label: "pièce", grams: 125 },
    ],
    defaultUnit: "tas",
    prices: [
      { unit: "tas", priceFcfa: 400, placeType: "market", ...estime },
      { unit: "pièce", priceFcfa: 100, placeType: "shop", ...estime },
      { unit: "kg", priceFcfa: 1000, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Oignon vert",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(2, 7, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "botte", grams: 100 }],
    defaultUnit: "botte",
    prices: [
      { unit: "botte", priceFcfa: 100, placeType: "market", ...estime },
      { unit: "botte", priceFcfa: 500, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Ail",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(60, null, null),
    seasonalMonths: toutLAnnee,
    units: [
      { label: "tête", grams: 40 },
      { label: "gousse", grams: 5 },
    ],
    defaultUnit: "tête",
    prices: [
      { unit: "tête", priceFcfa: 150, placeType: "market", ...estime },
      { unit: "tête", priceFcfa: 150, placeType: "shop", ...estime },
      { unit: "tête", priceFcfa: 200, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Gingembre",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(14, 30, 180),
    seasonalMonths: toutLAnnee,
    units: [{ label: "morceau", grams: 50 }],
    defaultUnit: "morceau",
    prices: [
      { unit: "morceau", priceFcfa: 100, placeType: "market", ...estime },
      { unit: "kg", priceFcfa: 2000, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Piment frais",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(4, 14, 90),
    seasonalMonths: toutLAnnee,
    units: [
      { label: "tas", grams: 50 },
      { label: "pièce", grams: 5 },
    ],
    defaultUnit: "tas",
    prices: [{ unit: "tas", priceFcfa: 100, placeType: "market", ...estime }],
  },
  {
    name: "Poivron",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(4, 10, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "pièce", grams: 150 }],
    defaultUnit: "pièce",
    prices: [
      { unit: "pièce", priceFcfa: 200, placeType: "market", ...estime },
      { unit: "kg", priceFcfa: 1800, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Aubergine",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(4, 10, null),
    seasonalMonths: toutLAnnee,
    units: [
      { label: "tas", grams: 400 },
      { label: "pièce", grams: 100 },
    ],
    defaultUnit: "tas",
    prices: [
      { unit: "tas", priceFcfa: 300, placeType: "market", ...estime },
      { unit: "kg", priceFcfa: 1200, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Gombo",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(3, 5, 90),
    seasonalMonths: toutLAnnee,
    units: [{ label: "tas", grams: 250 }],
    defaultUnit: "tas",
    prices: [{ unit: "tas", priceFcfa: 250, placeType: "market", ...estime }],
  },
  {
    name: "Graine de palme",
    category: "oléagineux",
    allergens: [],
    shelfLifeDays: conservation(3, 7, 90),
    seasonalMonths: toutLAnnee,
    storageTip: "La graine en boîte se garde longtemps et fait gagner une heure.",
    units: [
      { label: "tas", grams: 1000 },
      { label: "boîte de 800 g", grams: 800 },
    ],
    defaultUnit: "tas",
    prices: [
      { unit: "tas", priceFcfa: 500, placeType: "market", ...estime },
      { unit: "boîte de 800 g", priceFcfa: 1400, placeType: "shop", ...estime },
      { unit: "boîte de 800 g", priceFcfa: 1300, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Carotte",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(7, 21, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "tas", grams: 500 }],
    defaultUnit: "tas",
    prices: [
      { unit: "tas", priceFcfa: 500, placeType: "market", ...estime },
      { unit: "kg", priceFcfa: 1200, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Chou",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(7, 21, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "pièce", grams: 1000 }],
    defaultUnit: "pièce",
    prices: [
      { unit: "pièce", priceFcfa: 500, placeType: "market", ...estime },
      { unit: "kg", priceFcfa: 900, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Pomme de terre",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(30, null, null),
    seasonalMonths: toutLAnnee,
    storageTip: "Au sec et à l'abri de la lumière, jamais au frigo.",
    units: [{ label: "tas", grams: 1000 }],
    defaultUnit: "tas",
    prices: [
      { unit: "tas", priceFcfa: 800, placeType: "market", ...estime },
      { unit: "kg", priceFcfa: 1000, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Navet",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(7, 21, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "pièce", grams: 150 }],
    defaultUnit: "pièce",
    prices: [{ unit: "kg", priceFcfa: 2500, placeType: "supermarket", ...estime }],
  },
  {
    name: "Poireau",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(3, 10, 90),
    seasonalMonths: toutLAnnee,
    units: [{ label: "pièce", grams: 200 }],
    defaultUnit: "pièce",
    prices: [{ unit: "pièce", priceFcfa: 800, placeType: "supermarket", ...estime }],
  },
  {
    name: "Céleri branche",
    category: "légume",
    allergens: ["celeri"],
    shelfLifeDays: conservation(2, 10, null),
    seasonalMonths: toutLAnnee,
    units: [
      { label: "botte", grams: 400 },
      { label: "branche", grams: 60 },
    ],
    defaultUnit: "botte",
    prices: [{ unit: "botte", priceFcfa: 1500, placeType: "supermarket", ...estime }],
  },
  {
    name: "Courgette",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(4, 10, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "pièce", grams: 250 }],
    defaultUnit: "pièce",
    prices: [
      { unit: "pièce", priceFcfa: 300, placeType: "market", ...estime },
      { unit: "pièce", priceFcfa: 450, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Potiron",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(30, 5, 90),
    seasonalMonths: toutLAnnee,
    storageTip: "Entier, il se garde un mois ; une fois coupé, au frigo.",
    units: [{ label: "morceau", grams: 500 }],
    defaultUnit: "morceau",
    prices: [
      { unit: "morceau", priceFcfa: 300, placeType: "market", ...estime },
      { unit: "kg", priceFcfa: 900, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Laitue",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation(1, 5, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "pièce", grams: 300 }],
    defaultUnit: "pièce",
    prices: [
      { unit: "pièce", priceFcfa: 300, placeType: "market", ...estime },
      { unit: "pièce", priceFcfa: 700, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Citron",
    category: "fruit",
    allergens: [],
    shelfLifeDays: conservation(7, 21, null),
    seasonalMonths: toutLAnnee,
    units: [
      { label: "tas", grams: 400 },
      { label: "pièce", grams: 80 },
    ],
    defaultUnit: "pièce",
    prices: [
      { unit: "tas", priceFcfa: 200, placeType: "market", ...estime },
      { unit: "kg", priceFcfa: 1200, placeType: "supermarket", ...estime },
    ],
  },

  // Herbes fraîches
  {
    name: "Persil",
    category: "herbe",
    allergens: [],
    shelfLifeDays: conservation(1, 7, 90),
    seasonalMonths: toutLAnnee,
    storageTip: "Au frigo, enroulé dans un torchon humide.",
    units: [{ label: "botte", grams: 100 }],
    defaultUnit: "botte",
    prices: [
      { unit: "botte", priceFcfa: 200, placeType: "market", ...estime },
      { unit: "botte", priceFcfa: 600, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Menthe",
    category: "herbe",
    allergens: [],
    shelfLifeDays: conservation(1, 5, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "botte", grams: 30 }],
    defaultUnit: "botte",
    prices: [
      { unit: "botte", priceFcfa: 100, placeType: "market", ...estime },
      { unit: "botte", priceFcfa: 500, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Coriandre fraîche",
    category: "herbe",
    allergens: [],
    shelfLifeDays: conservation(1, 7, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "botte", grams: 50 }],
    defaultUnit: "botte",
    prices: [
      { unit: "botte", priceFcfa: 100, placeType: "market", ...estime },
      { unit: "botte", priceFcfa: 500, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Basilic",
    category: "herbe",
    allergens: [],
    shelfLifeDays: conservation(2, 5, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "botte", grams: 20 }],
    defaultUnit: "botte",
    prices: [{ unit: "botte", priceFcfa: 800, placeType: "supermarket", ...estime }],
  },
  {
    name: "Feuilles de curry",
    category: "herbe",
    allergens: [],
    shelfLifeDays: conservation(2, 14, 90),
    seasonalMonths: toutLAnnee,
    units: [
      { label: "sachet de 20 g", grams: 20 },
      { label: "brin", grams: 2.5 },
    ],
    defaultUnit: "sachet de 20 g",
    prices: [{ unit: "sachet de 20 g", priceFcfa: 700, placeType: "supermarket", ...estime }],
  },

  // Huiles et matières grasses
  {
    // Estimations sous le prix maximum officiel : 1 200 FCFA les 90 cl d'huile raffinée (CNLVC, 2026)
    name: "Huile végétale",
    category: "huile",
    allergens: [],
    shelfLifeDays: conservation(365, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "bouteille de 1 l", grams: 1000 }],
    defaultUnit: "bouteille de 1 l",
    prices: [
      { unit: "bouteille de 1 l", priceFcfa: 1200, placeType: "market", ...estime },
      { unit: "bouteille de 1 l", priceFcfa: 1300, placeType: "shop", ...estime },
      { unit: "bouteille de 1 l", priceFcfa: 1300, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Huile de palme",
    category: "huile",
    allergens: [],
    shelfLifeDays: conservation(365, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "bouteille de 1 l", grams: 1000 }],
    defaultUnit: "bouteille de 1 l",
    prices: [
      { unit: "bouteille de 1 l", priceFcfa: 1300, placeType: "market", ...estime },
      { unit: "bouteille de 1 l", priceFcfa: 1400, placeType: "shop", ...estime },
    ],
  },
  {
    name: "Huile d'olive",
    category: "huile",
    allergens: [],
    shelfLifeDays: conservation(540, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "bouteille de 500 ml", grams: 500 }],
    defaultUnit: "bouteille de 500 ml",
    prices: [
      { unit: "bouteille de 500 ml", priceFcfa: 4800, placeType: "shop", ...estime },
      { unit: "bouteille de 500 ml", priceFcfa: 4500, placeType: "supermarket", ...estime },
    ],
  },

  // Épicerie
  {
    name: "Pâte d'arachide",
    category: "épicerie",
    allergens: ["arachide"],
    shelfLifeDays: conservation(60, 120, null),
    seasonalMonths: toutLAnnee,
    units: [
      { label: "boule", grams: 250 },
      { label: "pot de 500 g", grams: 500 },
    ],
    defaultUnit: "boule",
    prices: [
      { unit: "boule", priceFcfa: 500, placeType: "market", ...estime },
      { unit: "pot de 500 g", priceFcfa: 1700, placeType: "shop", ...estime },
      { unit: "pot de 500 g", priceFcfa: 1800, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Tahiné",
    category: "épicerie",
    allergens: ["sesame"],
    shelfLifeDays: conservation(365, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "pot de 450 g", grams: 450 }],
    defaultUnit: "pot de 450 g",
    prices: [{ unit: "pot de 450 g", priceFcfa: 3500, placeType: "supermarket", ...estime }],
  },
  {
    name: "Cube de bouillon",
    category: "épicerie",
    allergens: [],
    shelfLifeDays: conservation(365, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "cube", grams: 10 }],
    defaultUnit: "cube",
    prices: [
      { unit: "cube", priceFcfa: 25, placeType: "market", ...estime },
      { unit: "cube", priceFcfa: 25, placeType: "shop", ...estime },
    ],
  },
  {
    name: "Sel",
    category: "épicerie",
    allergens: [],
    shelfLifeDays: conservation(1000, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "sachet de 500 g", grams: 500 }],
    defaultUnit: "sachet de 500 g",
    prices: [
      { unit: "sachet de 500 g", priceFcfa: 100, placeType: "market", ...estime },
      { unit: "sachet de 500 g", priceFcfa: 150, placeType: "shop", ...estime },
      { unit: "sachet de 500 g", priceFcfa: 250, placeType: "supermarket", ...estime },
    ],
  },
  {
    // Estimations plafonnées au prix maximum officiel : 875 FCFA le kg de sucre blanc (CNLVC, 2026)
    name: "Sucre en poudre",
    category: "épicerie",
    allergens: [],
    shelfLifeDays: conservation(1000, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "sachet de 1 kg", grams: 1000 }],
    defaultUnit: "sachet de 1 kg",
    prices: [
      { unit: "sachet de 1 kg", priceFcfa: 850, placeType: "market", ...estime },
      { unit: "sachet de 1 kg", priceFcfa: 875, placeType: "shop", ...estime },
      { unit: "sachet de 1 kg", priceFcfa: 875, placeType: "supermarket", ...estime },
    ],
  },
  {
    name: "Rhum brun",
    category: "épicerie",
    allergens: [],
    shelfLifeDays: conservation(1000, null, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "bouteille de 70 cl", grams: 700 }],
    defaultUnit: "bouteille de 70 cl",
    prices: [{ unit: "bouteille de 70 cl", priceFcfa: 6000, placeType: "supermarket", ...estime }],
  },
  {
    name: "Vin rouge ou blanc sec",
    category: "épicerie",
    allergens: ["sulfites"],
    shelfLifeDays: conservation(365, 5, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "bouteille de 75 cl", grams: 750 }],
    defaultUnit: "bouteille de 75 cl",
    prices: [{ unit: "bouteille de 75 cl", priceFcfa: 4000, placeType: "supermarket", ...estime }],
  },

  // Épices (sachets de 50 g)
  ...[
    { name: "Poivre moulu", market: 250, shop: 300, supermarket: 600 },
    { name: "Cumin moulu", market: 300, shop: null, supermarket: 700 },
    { name: "Graines de cumin", market: null, shop: null, supermarket: 800 },
    { name: "Paprika", market: null, shop: null, supermarket: 700 },
    { name: "Curcuma", market: 300, shop: null, supermarket: 600 },
    { name: "Piment rouge en poudre", market: 200, shop: 250, supermarket: 600 },
    { name: "Piment sec", market: 200, shop: null, supermarket: 600 },
    { name: "Coriandre moulue", market: null, shop: null, supermarket: 700 },
    { name: "Ras el-hanout", market: null, shop: null, supermarket: 900 },
    { name: "Thym séché", market: null, shop: 400, supermarket: 500 },
    { name: "Asa-fœtida", market: null, shop: null, supermarket: 1500 },
    { name: "Graines de fenugrec", market: null, shop: null, supermarket: 800 },
  ].map(({ name, ...parLieu }): IngredientDepart => ({
    name,
    category: "épice",
    // L'asa-fœtida du commerce est presque toujours mélangée à de la farine de blé
    allergens: name === "Asa-fœtida" ? ["gluten"] : [],
    shelfLifeDays: conservation(730, null, null),
    seasonalMonths: toutLAnnee,
    // Le piment sec se compte aussi à la pièce (piment entier séché)
    units:
      name === "Piment sec"
        ? [
            { label: "sachet de 50 g", grams: 50 },
            { label: "pièce", grams: 0.5 },
          ]
        : [{ label: "sachet de 50 g", grams: 50 }],
    defaultUnit: "sachet de 50 g",
    prices: (Object.entries(parLieu) as [PlaceType, number | null][])
      .filter((entree): entree is [PlaceType, number] => entree[1] !== null)
      .map(([placeType, priceFcfa]) => ({
        unit: "sachet de 50 g",
        priceFcfa,
        placeType,
        ...estime,
      })),
  })),
  {
    name: "Harissa",
    category: "épice",
    allergens: [],
    shelfLifeDays: conservation(365, 30, null),
    seasonalMonths: toutLAnnee,
    units: [{ label: "tube de 70 g", grams: 70 }],
    defaultUnit: "tube de 70 g",
    prices: [{ unit: "tube de 70 g", priceFcfa: 900, placeType: "supermarket", ...estime }],
  },
];

const aValider = (origine: string) =>
  `Aucune source signée trouvée : à valider par une cuisinière ${origine}.`;

export const recettesDepart: RecetteDepart[] = [
  // ───────── Côte d'Ivoire ─────────
  {
    title: "Garba",
    validated: false,
    cuisine: "ivoirienne",
    mealTypes: ["lunch", "dinner"],
    prepMinutes: 15,
    cookMinutes: 15,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["plat de rue", "rapide"],
    reference:
      "annuaireci.com, « Le garba, un plat ivoirien iconique » (site ivoirien, auteur non nommé) : à valider par une cuisinière ivoirienne.",
    ingredients: [
      { name: "Attiéké", quantity: 4, unit: "boule" },
      { name: "Thon frais", quantity: 800, unit: "g" },
      { name: "Oignon", quantity: 2, unit: "pièce" },
      { name: "Tomate", quantity: 2, unit: "pièce" },
      { name: "Piment frais", quantity: 4, unit: "pièce" },
      { name: "Huile végétale", quantity: 300, unit: "ml" },
      { name: "Cube de bouillon", quantity: 1, unit: "cube", optional: true },
      { name: "Sel", quantity: 1, unit: "c. à café" },
    ],
    steps: [
      {
        text: "Coupe les 800 g de thon en gros morceaux d'environ 5 cm. Sale-les avec la cuillère à café de sel et, si tu veux, frotte-les avec le cube écrasé.",
        minutes: 5,
      },
      {
        text: "Fais chauffer les 300 ml d'huile dans une poêle profonde ou une marmite, à feu moyen à vif. L'huile est prête quand un petit morceau de pain y grésille aussitôt.",
        minutes: 5,
      },
      {
        text: "Fais frire le thon par petites quantités, 5 à 6 minutes en le retournant, jusqu'à ce qu'il soit bien doré et croustillant dehors. Égoutte-le sur du papier ou une passoire.",
        minutes: 12,
      },
      {
        text: "Émince finement les 2 oignons et coupe les 2 tomates en rondelles. Écrase les 4 piments avec une pincée de sel (et une cuillère d'huile de friture si tu l'aimes doux).",
        minutes: 5,
      },
      {
        text: "Émiette les 4 boules d'attiéké avec les doigts, arrose-les d'un peu d'eau et réchauffe-les à la vapeur ou au micro-ondes, en remuant, jusqu'à ce qu'elles soient chaudes et souples.",
        minutes: 5,
      },
      {
        text: "Arrose l'attiéké chaud de 2 ou 3 cuillères d'huile de friture et mélange.",
        minutes: 1,
      },
      {
        text: "Sers l'attiéké dans chaque assiette avec les morceaux de thon, l'oignon, la tomate et le piment écrasé à côté.",
        minutes: 2,
      },
    ],
    leftoverIdeas: ["Le thon frit restant se mange froid dans du pain le lendemain."],
  },
  {
    title: "Attiéké poisson braisé",
    validated: false,
    cuisine: "ivoirienne",
    mealTypes: ["lunch", "dinner"],
    prepMinutes: 30,
    cookMinutes: 25,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["braise"],
    reference: aValider("ivoirienne"),
    ingredients: [
      { name: "Attiéké", quantity: 4, unit: "boule" },
      { name: "Carpe", quantity: 2, unit: "pièce" },
      { name: "Tomate", quantity: 3, unit: "pièce" },
      { name: "Oignon", quantity: 2, unit: "pièce" },
      { name: "Piment frais", quantity: 3, unit: "pièce" },
      { name: "Ail", quantity: 2, unit: "gousse" },
      { name: "Gingembre", quantity: 1, unit: "morceau" },
      { name: "Citron", quantity: 1, unit: "pièce" },
      { name: "Huile végétale", quantity: 4, unit: "c. à soupe" },
      { name: "Cube de bouillon", quantity: 1, unit: "cube", optional: true },
      { name: "Sel", quantity: 1, unit: "c. à café" },
    ],
    steps: [
      {
        text: "Écaille les 2 carpes, vide-les et rince-les à l'eau froide. Fais 2 ou 3 entailles profondes sur chaque face pour que la marinade pénètre.",
        minutes: 10,
      },
      {
        text: "Écrase ou mixe les 2 gousses d'ail, le morceau de gingembre, 1 piment, un demi-oignon, le sel et le cube : tu obtiens une pâte épaisse.",
        minutes: 5,
      },
      {
        text: "Frotte les poissons avec cette pâte, dedans comme dehors et dans les entailles. Laisse mariner au moins 15 minutes, au frais.",
        minutes: 15,
      },
      {
        text: "Allume le charbon et attends les braises bien rouges, sans flammes (ou fais chauffer le gril du four).",
        minutes: 10,
      },
      {
        text: "Fais braiser les poissons 10 à 12 minutes de chaque côté, en les badigeonnant des 4 cuillères d'huile. Ils sont cuits quand la chair se détache facilement de l'arête.",
        minutes: 25,
      },
      {
        text: "Pendant ce temps, coupe en petits dés les 3 tomates, le reste de l'oignon et les 2 piments restants. Arrose du jus du citron et sale légèrement.",
        minutes: 5,
      },
      {
        text: "Réchauffe les 4 boules d'attiéké à la vapeur avec un peu d'eau, puis sers-les avec le poisson et la sauce crue.",
        minutes: 5,
      },
    ],
    leftoverIdeas: ["Le poisson émietté se mélange à l'attiéké pour un garba maison le lendemain."],
  },
  {
    title: "Alloco et œufs",
    validated: false,
    cuisine: "ivoirienne",
    mealTypes: ["lunch", "dinner"],
    prepMinutes: 10,
    cookMinutes: 20,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["plat de rue", "rapide", "végétarien"],
    reference: aValider("ivoirienne"),
    ingredients: [
      { name: "Banane plantain", quantity: 4, unit: "doigt" },
      { name: "Œufs", quantity: 4, unit: "pièce" },
      { name: "Huile végétale", quantity: 500, unit: "ml" },
      { name: "Oignon", quantity: 1, unit: "pièce" },
      { name: "Piment frais", quantity: 2, unit: "pièce" },
      { name: "Tomate", quantity: 1, unit: "pièce", optional: true },
      { name: "Sel", quantity: 1, unit: "c. à café" },
    ],
    steps: [
      {
        text: "Choisis des bananes plantain bien mûres, à la peau jaune tachée de noir. Coupe les deux bouts, fends la peau sur la longueur et retire-la.",
        minutes: 3,
      },
      {
        text: "Coupe les 4 bananes en rondelles d'environ 1 cm ou en biais, puis sale-les légèrement.",
        minutes: 3,
      },
      {
        text: "Fais chauffer les 500 ml d'huile dans une poêle profonde à feu moyen à vif.",
        minutes: 5,
      },
      {
        text: "Fais frire les rondelles en une seule couche, 3 à 4 minutes de chaque côté, jusqu'à ce qu'elles soient bien dorées et caramélisées. Égoutte-les.",
        minutes: 10,
      },
      {
        text: "Émince l'oignon et les 2 piments (et la tomate si tu en mets). Bats les 4 œufs avec le sel, l'oignon et le piment.",
        minutes: 3,
      },
      {
        text: "Retire presque toute l'huile de la poêle, n'en garde qu'une cuillère, et cuis l'omelette 3 à 4 minutes à feu moyen jusqu'à ce qu'elle soit prise.",
        minutes: 4,
      },
      {
        text: "Sers l'alloco chaud avec l'omelette, et un peu de piment écrasé à côté pour ceux qui aiment.",
        minutes: 2,
      },
    ],
    leftoverIdeas: ["L'alloco froid se réchauffe quelques minutes à la poêle, sans huile."],
  },
  {
    title: "Sauce graine et riz",
    validated: false,
    cuisine: "ivoirienne",
    mealTypes: ["lunch"],
    prepMinutes: 30,
    cookMinutes: 90,
    needsCooking: true,
    servings: 4,
    difficulty: 2,
    tags: ["mijoté"],
    reference: aValider("ivoirienne"),
    ingredients: [
      { name: "Graine de palme", quantity: 1, unit: "tas" },
      { name: "Poisson fumé", quantity: 2, unit: "morceau" },
      { name: "Aubergine", quantity: 4, unit: "pièce" },
      { name: "Tomate", quantity: 2, unit: "pièce" },
      { name: "Oignon", quantity: 1, unit: "pièce" },
      { name: "Piment frais", quantity: 3, unit: "pièce" },
      { name: "Cube de bouillon", quantity: 1, unit: "cube", optional: true },
      { name: "Sel", quantity: 1, unit: "c. à café" },
      { name: "Riz", quantity: 500, unit: "g" },
    ],
    steps: [
      {
        text: "Lave le tas de graines de palme, mets-le dans une marmite, couvre largement d'eau et fais bouillir jusqu'à ce que la chair se détache facilement du noyau.",
        minutes: 30,
      },
      {
        text: "Égoutte les graines et pile-les encore chaudes dans un mortier, sans casser les noyaux, jusqu'à ce que la chair se détache des fibres.",
        minutes: 10,
      },
      {
        text: "Ajoute un grand bol d'eau chaude sur la pulpe, presse-la fort entre tes mains et récupère le jus rouge. Recommence 2 fois, puis filtre le jus pour retirer fibres et noyaux.",
        minutes: 15,
      },
      {
        text: "Verse le jus dans une marmite, ajoute l'oignon coupé en deux, les 2 tomates entières, les 4 aubergines et les 3 piments entiers. Fais cuire à feu moyen.",
        minutes: 20,
      },
      {
        text: "Retire les tomates, les aubergines et les piments quand ils sont tendres, écrase-les et remets-les dans la sauce (garde les piments à part si on n'aime pas fort).",
        minutes: 5,
      },
      {
        text: "Nettoie les 2 morceaux de poisson fumé, retire les arêtes, et ajoute-les à la sauce avec le cube et le sel.",
        minutes: 5,
      },
      {
        text: "Laisse mijoter à feu doux en remuant de temps en temps : la sauce est prête quand elle a épaissi et qu'une couche d'huile rouge remonte à la surface.",
        minutes: 30,
      },
      {
        text: "Pendant ce temps, lave les 500 g de riz et cuis-les dans deux fois leur volume d'eau salée, à couvert et à feu doux, jusqu'à ce que l'eau soit absorbée.",
        minutes: 20,
      },
    ],
    leftoverIdeas: ["La sauce se garde 2 jours au frigo et se mange aussi avec du foutou."],
  },
  {
    title: "Sauce arachide au poulet",
    validated: false,
    cuisine: "ivoirienne",
    mealTypes: ["lunch", "dinner"],
    prepMinutes: 20,
    cookMinutes: 60,
    needsCooking: true,
    servings: 4,
    difficulty: 2,
    tags: ["mijoté"],
    reference: aValider("ivoirienne"),
    ingredients: [
      { name: "Poulet", quantity: 1, unit: "poulet entier" },
      { name: "Pâte d'arachide", quantity: 1, unit: "boule" },
      { name: "Tomate", quantity: 3, unit: "pièce" },
      { name: "Concentré de tomate", quantity: 1, unit: "boîte de 70 g" },
      { name: "Oignon", quantity: 2, unit: "pièce" },
      { name: "Ail", quantity: 2, unit: "gousse" },
      { name: "Piment frais", quantity: 2, unit: "pièce" },
      { name: "Cube de bouillon", quantity: 1, unit: "cube", optional: true },
      { name: "Sel", quantity: 1, unit: "c. à café" },
      { name: "Riz", quantity: 500, unit: "g" },
    ],
    steps: [
      {
        text: "Découpe le poulet en morceaux, lave-les et mets-les dans une marmite avec 1 oignon émincé, les 2 gousses d'ail écrasées, le sel et un fond d'eau.",
        minutes: 10,
      },
      {
        text: "Fais cuire à couvert et à feu moyen jusqu'à ce que le poulet commence à rendre son jus.",
        minutes: 15,
      },
      {
        text: "Mixe ou écrase les 3 tomates. Ajoute-les dans la marmite avec la boîte de concentré de tomate et le deuxième oignon émincé, puis mélange.",
        minutes: 10,
      },
      {
        text: "Dans un bol, délaye la boule de pâte d'arachide avec une louche de bouillon tiède, en écrasant à la fourchette jusqu'à obtenir une crème sans grumeaux.",
        minutes: 5,
      },
      {
        text: "Verse la crème d'arachide dans la marmite, ajoute de l'eau à hauteur du poulet, le cube et les 2 piments entiers.",
        minutes: 3,
      },
      {
        text: "Laisse mijoter à feu doux en remuant souvent, car la sauce attache facilement. Elle est prête quand elle est épaisse et qu'une fine couche d'huile remonte en surface.",
        minutes: 35,
      },
      {
        text: "Pendant ce temps, cuis les 500 g de riz lavé dans deux fois leur volume d'eau salée, à couvert, jusqu'à ce que l'eau soit absorbée.",
        minutes: 20,
      },
    ],
    leftoverIdeas: ["La sauce réchauffée est encore meilleure le lendemain."],
  },
  {
    title: "Riz gras au poulet",
    validated: false,
    cuisine: "ivoirienne",
    mealTypes: ["lunch", "dinner"],
    prepMinutes: 20,
    cookMinutes: 50,
    needsCooking: true,
    servings: 4,
    difficulty: 2,
    tags: ["une marmite"],
    reference: aValider("ivoirienne"),
    ingredients: [
      { name: "Poulet", quantity: 1, unit: "poulet entier" },
      { name: "Riz", quantity: 500, unit: "g" },
      { name: "Concentré de tomate", quantity: 1, unit: "boîte de 70 g" },
      { name: "Tomate", quantity: 3, unit: "pièce" },
      { name: "Oignon", quantity: 2, unit: "pièce" },
      { name: "Carotte", quantity: 200, unit: "g" },
      { name: "Chou", quantity: 300, unit: "g" },
      { name: "Poivron", quantity: 1, unit: "pièce" },
      { name: "Ail", quantity: 2, unit: "gousse" },
      { name: "Huile végétale", quantity: 6, unit: "c. à soupe" },
      { name: "Cube de bouillon", quantity: 2, unit: "cube", optional: true },
      { name: "Sel", quantity: 1, unit: "c. à café" },
    ],
    steps: [
      {
        text: "Découpe le poulet en morceaux, assaisonne-les avec un peu de sel et l'ail écrasé, puis fais-les dorer dans les 6 cuillères d'huile, à feu moyen, sur toutes les faces. Réserve-les.",
        minutes: 15,
      },
      {
        text: "Dans la même huile, fais revenir les 2 oignons émincés jusqu'à ce qu'ils soient transparents.",
        minutes: 5,
      },
      {
        text: "Ajoute les 3 tomates mixées et la boîte de concentré, et laisse cuire en remuant jusqu'à ce que la sauce fonce et que l'huile se sépare.",
        minutes: 8,
      },
      {
        text: "Coupe les 200 g de carottes en rondelles, les 300 g de chou en gros morceaux et le poivron en lanières. Ajoute-les avec les 2 cubes, le reste du sel et environ 1 litre d'eau. Laisse cuire 10 minutes.",
        minutes: 12,
      },
      { text: "Retire les légumes avec une écumoire et garde-les au chaud.", minutes: 2 },
      {
        text: "Lave les 500 g de riz, verse-les dans la sauce : le liquide doit dépasser le riz d'un doigt, ajoute de l'eau si besoin.",
        minutes: 3,
      },
      {
        text: "Couvre et cuis à feu très doux, sans remuer, jusqu'à ce que le riz ait tout absorbé et soit tendre. Ajoute un peu d'eau s'il sèche avant d'être cuit.",
        minutes: 25,
      },
      {
        text: "Pose le poulet et les légumes sur le riz, couvre 5 minutes pour les réchauffer, puis sers.",
        minutes: 5,
      },
    ],
    leftoverIdeas: ["Le riz gras se réchauffe à la poêle avec un œuf pour un repas rapide."],
  },
  {
    title: "Kédjénou de poulet",
    validated: false,
    cuisine: "ivoirienne",
    mealTypes: ["lunch", "dinner"],
    prepMinutes: 20,
    cookMinutes: 50,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["étouffée", "sans matière grasse"],
    reference:
      "annuaireci.com, « Kedjenou de poulet : la recette ivoirienne traditionnelle pas à pas » (site ivoirien, auteur non nommé) : à valider par une cuisinière ivoirienne.",
    ingredients: [
      { name: "Poulet", quantity: 1, unit: "poulet entier" },
      { name: "Tomate", quantity: 4, unit: "pièce" },
      { name: "Oignon", quantity: 2, unit: "pièce" },
      { name: "Aubergine", quantity: 2, unit: "pièce" },
      { name: "Poivron", quantity: 2, unit: "pièce" },
      { name: "Piment frais", quantity: 2, unit: "pièce" },
      { name: "Gingembre", quantity: 1, unit: "morceau" },
      { name: "Ail", quantity: 3, unit: "gousse" },
      { name: "Gombo", quantity: 100, unit: "g", optional: true },
      { name: "Sel", quantity: 1, unit: "c. à café" },
      { name: "Attiéké", quantity: 4, unit: "boule" },
    ],
    steps: [
      {
        text: "Découpe le poulet en morceaux et lave-les. Coupe les 4 tomates, les 2 oignons, les 2 aubergines et les 2 poivrons en gros morceaux.",
        minutes: 15,
      },
      { text: "Écrase les 3 gousses d'ail et le morceau de gingembre.", minutes: 3 },
      {
        text: "Mets tout dans le canari ou une cocotte à couvercle lourd : poulet, légumes, ail, gingembre, les 2 piments entiers, le sel, et le gombo si tu en mets. Mélange avec les mains. N'ajoute ni eau ni huile.",
        minutes: 3,
      },
      {
        text: "Ferme bien (avec une feuille de bananier sous le couvercle si tu en as) et pose sur feu doux.",
        minutes: 2,
      },
      {
        text: "Laisse cuire à l'étouffée. Toutes les 10 minutes, soulève la marmite et secoue-la sans l'ouvrir pour que rien n'attache : les légumes rendent leur jus et cuisent le poulet.",
        minutes: 50,
      },
      {
        text: "Le kédjénou est prêt quand le poulet est tendre et nappé d'une sauce épaisse. Goûte et rectifie le sel.",
        minutes: 2,
      },
      {
        text: "Réchauffe les 4 boules d'attiéké à la vapeur et sers-les avec le poulet et sa sauce.",
        minutes: 5,
      },
    ],
    leftoverIdeas: ["Les restes de sauce parfument très bien un riz blanc."],
  },
  {
    title: "Placali sauce gombo",
    validated: false,
    cuisine: "ivoirienne",
    mealTypes: ["lunch"],
    prepMinutes: 20,
    cookMinutes: 50,
    needsCooking: true,
    servings: 4,
    difficulty: 2,
    tags: [],
    reference: aValider("ivoirienne"),
    ingredients: [
      { name: "Pâte de manioc fermentée", quantity: 2, unit: "boule" },
      { name: "Gombo", quantity: 2, unit: "tas" },
      { name: "Poisson fumé", quantity: 2, unit: "morceau" },
      { name: "Huile de palme", quantity: 6, unit: "c. à soupe" },
      { name: "Oignon", quantity: 1, unit: "pièce" },
      { name: "Piment frais", quantity: 2, unit: "pièce" },
      { name: "Cube de bouillon", quantity: 1, unit: "cube", optional: true },
      { name: "Sel", quantity: 1, unit: "c. à café" },
    ],
    steps: [
      {
        text: "Coupe les 500 g de gombos en fines rondelles, en retirant les queues.",
        minutes: 10,
      },
      {
        text: "Fais bouillir environ 1 litre d'eau avec l'oignon émincé, les 2 morceaux de poisson fumé nettoyés et sans arêtes, le cube et le sel.",
        minutes: 10,
      },
      {
        text: "Ajoute les gombos, les 6 cuillères d'huile de palme et les 2 piments. Cuis sans couvrir à feu moyen en battant la sauce avec une cuillère en bois pour qu'elle devienne gluante et file.",
        minutes: 15,
      },
      {
        text: "Pour le placali, délaye les 2 boules de pâte de manioc dans environ 500 ml d'eau, en écrasant les grumeaux.",
        minutes: 5,
      },
      {
        text: "Verse dans une marmite et chauffe à feu moyen en remuant énergiquement et sans arrêt avec une spatule en bois.",
        minutes: 15,
      },
      {
        text: "Continue jusqu'à obtenir une pâte lisse, légèrement translucide, élastique, qui se détache des bords. Ajoute un peu d'eau si elle est trop dure.",
        minutes: 10,
      },
      {
        text: "Mouille tes mains et forme des boules de placali. Sers-les avec la sauce gombo bien chaude.",
        minutes: 5,
      },
    ],
    leftoverIdeas: ["La sauce gombo se congèle très bien en portions."],
  },
  {
    title: "Spaghetti sautés",
    validated: false,
    cuisine: "ivoirienne",
    mealTypes: ["dinner"],
    prepMinutes: 10,
    cookMinutes: 20,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["plat de rue", "rapide", "végétarien"],
    reference: aValider("ivoirienne"),
    ingredients: [
      { name: "Spaghetti", quantity: 1, unit: "paquet de 500 g" },
      { name: "Tomate", quantity: 2, unit: "pièce" },
      { name: "Oignon", quantity: 2, unit: "pièce" },
      { name: "Concentré de tomate", quantity: 1, unit: "boîte de 70 g" },
      { name: "Poivron", quantity: 1, unit: "pièce", optional: true },
      { name: "Piment frais", quantity: 2, unit: "pièce" },
      { name: "Huile végétale", quantity: 5, unit: "c. à soupe" },
      { name: "Cube de bouillon", quantity: 1, unit: "cube", optional: true },
      { name: "Sel", quantity: 1, unit: "c. à café" },
    ],
    steps: [
      {
        text: "Fais bouillir une grande marmite d'eau salée et cuis le paquet de spaghetti en suivant le temps du paquet, en les gardant un peu fermes.",
        minutes: 12,
      },
      {
        text: "Égoutte-les et rince-les à l'eau froide pour qu'ils ne collent pas entre eux.",
        minutes: 2,
      },
      {
        text: "Émince les 2 oignons et le poivron, coupe les 2 tomates en petits dés et écrase les 2 piments.",
        minutes: 5,
      },
      {
        text: "Dans une grande poêle, fais chauffer les 5 cuillères d'huile à feu moyen et fais revenir les oignons et le poivron jusqu'à ce qu'ils soient tendres.",
        minutes: 5,
      },
      {
        text: "Ajoute les tomates, la boîte de concentré, le piment, le cube écrasé et le sel. Laisse cuire jusqu'à obtenir une sauce épaisse.",
        minutes: 5,
      },
      {
        text: "Ajoute les spaghetti et fais-les sauter à feu vif en remuant, jusqu'à ce qu'ils soient bien enrobés de sauce et commencent à dorer.",
        minutes: 5,
      },
    ],
    leftoverIdeas: ["Réchauffés à la poêle, ils deviennent un peu croustillants."],
  },
  {
    title: "Pain omelette",
    validated: false,
    cuisine: "ivoirienne",
    mealTypes: ["breakfast"],
    prepMinutes: 5,
    cookMinutes: 5,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["rapide", "végétarien"],
    reference: aValider("ivoirienne"),
    ingredients: [
      { name: "Baguette", quantity: 2, unit: "pièce" },
      { name: "Œufs", quantity: 6, unit: "pièce" },
      { name: "Oignon", quantity: 1, unit: "pièce" },
      { name: "Piment frais", quantity: 1, unit: "pièce" },
      { name: "Tomate", quantity: 1, unit: "pièce", optional: true },
      { name: "Huile végétale", quantity: 2, unit: "c. à soupe" },
      { name: "Sel", quantity: 0.5, unit: "c. à café" },
    ],
    steps: [
      {
        text: "Émince finement l'oignon et le piment, et coupe la tomate en rondelles si tu en mets.",
        minutes: 3,
      },
      {
        text: "Bats les 6 œufs avec l'oignon, le piment et le sel jusqu'à ce que le mélange soit mousseux.",
        minutes: 2,
      },
      {
        text: "Fais chauffer les 2 cuillères d'huile dans une poêle à feu moyen et verse les œufs. Laisse cuire 3 à 4 minutes, en ramenant les bords vers le centre, jusqu'à ce que l'omelette soit prise.",
        minutes: 4,
      },
      {
        text: "Coupe les 2 baguettes en deux, puis ouvre chaque morceau sur la longueur sans le séparer complètement.",
        minutes: 2,
      },
      {
        text: "Glisse un quart de l'omelette et quelques rondelles de tomate dans chaque morceau de pain, et sers tout de suite.",
        minutes: 2,
      },
    ],
    leftoverIdeas: [],
  },
  {
    title: "Aubergines sautées aux œufs",
    validated: false,
    cuisine: "ivoirienne",
    mealTypes: ["lunch", "dinner"],
    prepMinutes: 5,
    cookMinutes: 15,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["rapide", "végétarien"],
    reference: aValider("ivoirienne"),
    ingredients: [
      { name: "Aubergine", quantity: 4, unit: "pièce" },
      { name: "Œufs", quantity: 4, unit: "pièce" },
      { name: "Oignon", quantity: 1, unit: "pièce" },
      { name: "Tomate", quantity: 2, unit: "pièce" },
      { name: "Piment frais", quantity: 1, unit: "pièce", optional: true },
      { name: "Huile végétale", quantity: 3, unit: "c. à soupe" },
      { name: "Sel", quantity: 0.5, unit: "c. à café" },
    ],
    steps: [
      {
        text: "Lave les 4 aubergines et coupe-les en dés d'environ 2 cm. Émince l'oignon, coupe les 2 tomates en petits dés et le piment en fines rondelles si tu en mets.",
        minutes: 5,
      },
      {
        text: "Fais chauffer les 3 cuillères d'huile dans une grande poêle à feu moyen à vif.",
        minutes: 2,
      },
      {
        text: "Ajoute les aubergines et l'oignon, et fais-les revenir en remuant souvent, jusqu'à ce que les aubergines soient dorées et tendres.",
        minutes: 8,
      },
      {
        text: "Ajoute les tomates, le piment et le sel, puis laisse cuire en remuant jusqu'à ce que les tomates fondent.",
        minutes: 4,
      },
      {
        text: "Bats les 4 œufs, verse-les sur les légumes et remue doucement, jusqu'à ce qu'ils soient pris mais encore moelleux. Sers chaud.",
        minutes: 3,
      },
    ],
    leftoverIdeas: ["Dans du pain le lendemain matin."],
  },

  // ───────── Liban ─────────
  {
    title: "Taboulé",
    validated: true,
    cuisine: "libanaise",
    mealTypes: ["lunch", "dinner"],
    prepMinutes: 30,
    cookMinutes: 0,
    needsCooking: false,
    servings: 4,
    difficulty: 1,
    tags: ["sans cuisson", "végétarien"],
    reference:
      "Hadia Zebib Khanafer, Hadia's Lebanese Cuisine, « Authentic Lebanese Tabbouleh » : hadiaslebanesecuisine.com/blog/wprm_print/authentic-lebanese-tabbouleh",
    ingredients: [
      { name: "Persil", quantity: 3, unit: "botte" },
      { name: "Tomate", quantity: 5, unit: "pièce" },
      { name: "Menthe", quantity: 0.25, unit: "botte" },
      { name: "Oignon", quantity: 1, unit: "pièce" },
      { name: "Boulgour fin", quantity: 15, unit: "g" },
      { name: "Huile d'olive", quantity: 120, unit: "ml" },
      { name: "Citron", quantity: 2, unit: "pièce" },
      { name: "Sel", quantity: 1, unit: "c. à café" },
      { name: "Laitue", quantity: 1, unit: "pièce", optional: true },
    ],
    steps: [
      {
        text: "Lave les 3 bottes de persil et les feuilles de menthe dans plusieurs eaux, jusqu'à ce qu'il ne reste plus de terre. Égoutte-les, puis sèche-les bien dans un torchon propre : un persil mouillé rend le taboulé détrempé.",
        minutes: 10,
      },
      {
        text: "Retire les grosses tiges du persil. Serre les feuilles en petit tas et hache-les très finement avec un couteau bien aiguisé, sans écraser. Évite le mixeur, qui en fait une purée.",
        minutes: 10,
      },
      { text: "Hache finement les feuilles de menthe de la même façon.", minutes: 3 },
      {
        text: "Coupe les 5 tomates en tout petits dés, d'environ un demi-centimètre, et l'oignon le plus finement possible.",
        minutes: 8,
      },
      {
        text: "Rince la cuillère de boulgour fin, égoutte-la et pose-la sur les tomates : le boulgour gonfle avec leur jus.",
        minutes: 10,
      },
      {
        text: "Juste avant de servir, mélange tout avec le jus des 2 citrons, les 120 ml d'huile d'olive et la cuillère à café de sel. Goûte et ajoute un peu de citron ou de sel si besoin.",
        minutes: 2,
      },
      {
        text: "Sers tout de suite, avec des feuilles de laitue pour le manger à la main.",
        minutes: 1,
      },
    ],
    leftoverIdeas: ["Le persil haché en trop se garde 2 jours au frigo, sans assaisonnement."],
  },
  {
    title: "Houmous",
    validated: false,
    cuisine: "libanaise",
    mealTypes: ["breakfast", "lunch", "dinner"],
    prepMinutes: 15,
    cookMinutes: 90,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["végétarien", "trempage la veille"],
    reference: aValider("libanaise"),
    ingredients: [
      { name: "Pois chiches secs", quantity: 250, unit: "g" },
      { name: "Tahiné", quantity: 120, unit: "g" },
      { name: "Citron", quantity: 2, unit: "pièce" },
      { name: "Ail", quantity: 1, unit: "gousse" },
      { name: "Sel", quantity: 1, unit: "c. à café" },
      { name: "Huile d'olive", quantity: 2, unit: "c. à soupe" },
      { name: "Cumin moulu", quantity: 0.25, unit: "c. à café", optional: true },
      { name: "Pain libanais", quantity: 1, unit: "paquet de 5" },
    ],
    steps: [
      {
        text: "La veille, rince les 250 g de pois chiches secs et mets-les à tremper dans trois fois leur volume d'eau froide, pendant au moins 12 heures.",
        minutes: 2,
      },
      {
        text: "Égoutte et rince les pois chiches. Mets-les dans une marmite, couvre largement d'eau sans sel et porte à ébullition. Retire la mousse qui se forme.",
        minutes: 10,
      },
      {
        text: "Laisse cuire à petit feu jusqu'à ce que les pois chiches s'écrasent facilement entre deux doigts. Garde un bol d'eau de cuisson.",
        minutes: 80,
      },
      {
        text: "Mixe les pois chiches encore chauds avec la gousse d'ail, le jus des 2 citrons et le sel, jusqu'à obtenir une pâte épaisse.",
        minutes: 5,
      },
      {
        text: "Ajoute les 120 g de tahiné et mixe de nouveau, en versant l'eau de cuisson cuillère par cuillère, jusqu'à obtenir une crème lisse et légère.",
        minutes: 5,
      },
      { text: "Goûte : ajoute du citron, du sel ou du tahiné selon ton goût.", minutes: 1 },
      {
        text: "Étale le houmous dans une assiette creuse en creusant un puits au centre, arrose des 2 cuillères d'huile d'olive, saupoudre de cumin si tu veux et sers avec le pain.",
        minutes: 2,
      },
    ],
    leftoverIdeas: ["Le houmous se garde 3 jours au frigo, couvert d'un filet d'huile d'olive."],
  },
  {
    title: "Moujaddara",
    validated: false,
    cuisine: "libanaise",
    mealTypes: ["lunch", "dinner"],
    prepMinutes: 10,
    cookMinutes: 50,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["végétarien", "petit budget"],
    reference: aValider("libanaise"),
    ingredients: [
      { name: "Lentilles vertes", quantity: 250, unit: "g" },
      { name: "Riz", quantity: 200, unit: "g" },
      { name: "Oignon", quantity: 4, unit: "pièce" },
      { name: "Huile végétale", quantity: 100, unit: "ml" },
      { name: "Sel", quantity: 1.5, unit: "c. à café" },
      { name: "Cumin moulu", quantity: 1, unit: "c. à café", optional: true },
    ],
    steps: [
      {
        text: "Rince les 250 g de lentilles, mets-les dans une marmite avec 750 ml d'eau et fais-les cuire 15 minutes à feu moyen : elles doivent rester un peu fermes. Ne les égoutte pas.",
        minutes: 15,
      },
      { text: "Pendant ce temps, émince finement les 4 oignons en lamelles.", minutes: 5 },
      {
        text: "Fais chauffer les 100 ml d'huile dans une poêle et fais frire les oignons à feu moyen, en remuant souvent, jusqu'à ce qu'ils soient bien bruns. Ne les laisse pas noircir, sinon ils deviennent amers.",
        minutes: 20,
      },
      {
        text: "Retire la moitié des oignons et pose-la sur du papier : elle va devenir croustillante pour la fin.",
        minutes: 1,
      },
      {
        text: "Rince les 200 g de riz et ajoute-les aux lentilles avec l'autre moitié des oignons et leur huile, le sel et le cumin. Complète d'eau chaude si besoin : le liquide doit dépasser d'un doigt.",
        minutes: 3,
      },
      {
        text: "Couvre et cuis à feu doux jusqu'à ce que le riz soit tendre et ait absorbé l'eau. Laisse reposer 5 minutes à couvert.",
        minutes: 25,
      },
      {
        text: "Sers avec les oignons croustillants par-dessus, avec une salade de tomates ou du yaourt.",
        minutes: 2,
      },
    ],
    leftoverIdeas: ["Elle se mange aussi froide, avec une salade de tomates."],
  },

  // ───────── France ─────────
  {
    title: "Crêpes",
    validated: true,
    cuisine: "française",
    mealTypes: ["breakfast"],
    prepMinutes: 10,
    cookMinutes: 30,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["végétarien", "sucré"],
    reference:
      "Philippe Etchebest, chef français, recette publiée par le Guide Michelin (13 août 2021).",
    ingredients: [
      { name: "Farine de blé", quantity: 250, unit: "g" },
      { name: "Œufs", quantity: 4, unit: "pièce" },
      { name: "Lait", quantity: 600, unit: "ml" },
      { name: "Beurre", quantity: 40, unit: "g" },
      { name: "Sucre en poudre", quantity: 40, unit: "g" },
      { name: "Sel", quantity: 0.25, unit: "c. à café" },
      { name: "Rhum brun", quantity: 1, unit: "c. à soupe", optional: true },
    ],
    steps: [
      {
        text: "Dans un grand saladier, mélange les 250 g de farine, les 40 g de sucre et le sel. Creuse un puits au milieu.",
        minutes: 2,
      },
      {
        text: "Casse les 4 œufs dans le puits et fouette en partant du centre, en ramenant peu à peu la farine.",
        minutes: 3,
      },
      {
        text: "Verse les 600 ml de lait petit à petit, en fouettant toujours, jusqu'à obtenir une pâte lisse et sans grumeaux.",
        minutes: 4,
      },
      {
        text: "Fais fondre les 40 g de beurre et ajoute-le à la pâte, avec le rhum si tu en mets. Mélange bien.",
        minutes: 2,
      },
      {
        text: "Fais chauffer une poêle à feu moyen à vif et graisse-la avec un papier imbibé d'huile.",
        minutes: 2,
      },
      {
        text: "Verse une demi-louche de pâte et incline la poêle pour l'étaler en couche fine. Cuis environ 1 minute, jusqu'à ce que les bords dorent et se décollent.",
        minutes: 15,
      },
      {
        text: "Retourne la crêpe avec une spatule et cuis l'autre face environ 1 minute. Recommence jusqu'à la fin de la pâte, en graissant la poêle de temps en temps.",
        minutes: 15,
      },
    ],
    leftoverIdeas: ["Les crêpes se gardent 2 jours au frigo, roulées dans un torchon."],
  },
  {
    title: "Soupe de légumes",
    validated: true,
    cuisine: "française",
    mealTypes: ["dinner"],
    prepMinutes: 20,
    cookMinutes: 45,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["végétarien"],
    reference:
      "Jean-Pierre Coffe, critique culinaire français, « Potage du cultivateur » : jardiner-malin.fr/recettes/potage-du-cultivateur.html",
    ingredients: [
      { name: "Pomme de terre", quantity: 400, unit: "g" },
      { name: "Carotte", quantity: 250, unit: "g" },
      { name: "Navet", quantity: 2, unit: "pièce" },
      { name: "Poireau", quantity: 2, unit: "pièce" },
      { name: "Oignon", quantity: 1, unit: "pièce" },
      { name: "Céleri branche", quantity: 1, unit: "branche", optional: true },
      { name: "Beurre", quantity: 45, unit: "g" },
      { name: "Sel", quantity: 2, unit: "c. à café" },
      { name: "Poivre moulu", quantity: 0.5, unit: "c. à café" },
    ],
    steps: [
      {
        text: "Épluche les 400 g de pommes de terre, les 250 g de carottes, les 2 navets et l'oignon. Coupe le vert des 2 poireaux et lave-les bien entre les feuilles.",
        minutes: 10,
      },
      {
        text: "Coupe tous les légumes en petits dés ou en fines lamelles, à peu près de la même taille pour qu'ils cuisent en même temps (et la branche de céleri si tu en mets).",
        minutes: 10,
      },
      { text: "Fais fondre les 45 g de beurre dans une grande marmite à feu doux.", minutes: 2 },
      {
        text: "Ajoute les légumes, couvre et laisse-les fondre doucement en remuant de temps en temps, sans qu'ils prennent de couleur.",
        minutes: 15,
      },
      {
        text: "Verse 2 litres d'eau, ajoute les 2 cuillères à café de sel et le poivre, et porte à ébullition.",
        minutes: 8,
      },
      {
        text: "Baisse le feu et laisse cuire une demi-heure à petits bouillons, jusqu'à ce que les légumes soient bien tendres. Goûte et rectifie le sel.",
        minutes: 30,
      },
    ],
    leftoverIdeas: ["La soupe se garde 3 jours au frigo et se congèle en portions."],
  },
  {
    title: "Poulet rôti et pommes de terre",
    validated: false,
    cuisine: "française",
    mealTypes: ["lunch"],
    prepMinutes: 15,
    cookMinutes: 75,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["four"],
    reference: aValider("française"),
    ingredients: [
      { name: "Poulet", quantity: 1, unit: "poulet entier" },
      { name: "Pomme de terre", quantity: 1, unit: "tas" },
      { name: "Beurre", quantity: 40, unit: "g" },
      { name: "Ail", quantity: 4, unit: "gousse" },
      { name: "Thym séché", quantity: 1, unit: "c. à café" },
      { name: "Huile végétale", quantity: 2, unit: "c. à soupe" },
      { name: "Sel", quantity: 1.5, unit: "c. à café" },
      { name: "Poivre moulu", quantity: 0.5, unit: "c. à café" },
    ],
    steps: [
      {
        text: "Sors le poulet du frigo 30 minutes avant pour qu'il cuise régulièrement, et préchauffe le four à 210 °C.",
        minutes: 10,
      },
      {
        text: "Mélange les 40 g de beurre ramolli avec le thym, la moitié du sel et le poivre. Frotte-en tout le poulet, et glisse les 4 gousses d'ail entières à l'intérieur.",
        minutes: 5,
      },
      {
        text: "Épluche ou lave le kilo de pommes de terre et coupe-les en quartiers. Mélange-les dans le plat avec les 2 cuillères d'huile et le reste du sel.",
        minutes: 10,
      },
      {
        text: "Pose le poulet au milieu du plat, entouré des pommes de terre, et enfourne pour 20 minutes.",
        minutes: 20,
      },
      {
        text: "Baisse le four à 180 °C et poursuis la cuisson 45 minutes, en arrosant le poulet avec son jus toutes les 15 minutes et en retournant les pommes de terre une fois.",
        minutes: 45,
      },
      {
        text: "Vérifie la cuisson : en piquant la cuisse, le jus qui sort doit être clair, sans trace rose.",
        minutes: 2,
      },
      {
        text: "Laisse reposer le poulet 10 minutes sous une feuille d'aluminium avant de le découper : il reste plus moelleux.",
        minutes: 10,
      },
    ],
    leftoverIdeas: [
      "La carcasse fait un bon bouillon pour une soupe.",
      "Le poulet effiloché se glisse dans un sandwich ou une salade.",
    ],
  },

  // ───────── Maghreb ─────────
  {
    title: "Chakchouka",
    validated: false,
    cuisine: "tunisienne",
    mealTypes: ["breakfast", "dinner"],
    prepMinutes: 10,
    cookMinutes: 25,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["végétarien", "une poêle"],
    reference: aValider("tunisienne"),
    ingredients: [
      { name: "Œufs", quantity: 4, unit: "pièce" },
      { name: "Tomate", quantity: 6, unit: "pièce" },
      { name: "Poivron", quantity: 2, unit: "pièce" },
      { name: "Oignon", quantity: 1, unit: "pièce" },
      { name: "Ail", quantity: 2, unit: "gousse" },
      { name: "Huile d'olive", quantity: 4, unit: "c. à soupe" },
      { name: "Harissa", quantity: 1, unit: "c. à café", optional: true },
      { name: "Cumin moulu", quantity: 1, unit: "c. à café" },
      { name: "Paprika", quantity: 1, unit: "c. à café" },
      { name: "Sel", quantity: 1, unit: "c. à café" },
      { name: "Baguette", quantity: 1, unit: "pièce", optional: true },
    ],
    steps: [
      {
        text: "Émince l'oignon, coupe les 2 poivrons en fines lamelles et hache les 2 gousses d'ail. Coupe les 6 tomates en petits dés.",
        minutes: 8,
      },
      {
        text: "Fais chauffer les 4 cuillères d'huile d'olive dans une grande poêle à feu moyen. Fais fondre l'oignon et les poivrons en remuant, jusqu'à ce qu'ils soient tendres.",
        minutes: 10,
      },
      {
        text: "Ajoute l'ail, le cumin, le paprika et la harissa, et remue 1 minute pour que les épices libèrent leur parfum.",
        minutes: 1,
      },
      {
        text: "Ajoute les tomates et le sel. Laisse mijoter à feu moyen en remuant de temps en temps, jusqu'à ce que la sauce épaississe et que l'eau des tomates s'évapore.",
        minutes: 10,
      },
      {
        text: "Creuse 4 petits puits dans la sauce avec une cuillère et casse un œuf dans chacun.",
        minutes: 1,
      },
      {
        text: "Couvre et laisse cuire à feu doux jusqu'à ce que les blancs soient pris et que les jaunes restent coulants.",
        minutes: 6,
      },
      { text: "Sers directement dans la poêle, avec du pain pour saucer.", minutes: 1 },
    ],
    leftoverIdeas: ["La sauce sans les œufs se garde 2 jours : il suffit d'y recasser des œufs."],
  },
  {
    title: "Couscous aux légumes",
    validated: true,
    cuisine: "marocaine",
    mealTypes: ["lunch"],
    prepMinutes: 30,
    cookMinutes: 75,
    needsCooking: true,
    servings: 4,
    difficulty: 2,
    tags: ["végétarien", "trempage la veille"],
    reference:
      "Couscous aux sept légumes de Choumicha, cheffe marocaine (moroccotravelblog.com) : page à revérifier.",
    ingredients: [
      { name: "Semoule de couscous", quantity: 500, unit: "g" },
      { name: "Carotte", quantity: 300, unit: "g" },
      { name: "Navet", quantity: 2, unit: "pièce" },
      { name: "Courgette", quantity: 2, unit: "pièce" },
      { name: "Potiron", quantity: 1, unit: "morceau" },
      { name: "Chou", quantity: 300, unit: "g" },
      { name: "Pois chiches secs", quantity: 100, unit: "g" },
      { name: "Oignon", quantity: 2, unit: "pièce" },
      { name: "Tomate", quantity: 2, unit: "pièce" },
      { name: "Ras el-hanout", quantity: 1, unit: "c. à café" },
      { name: "Curcuma", quantity: 0.5, unit: "c. à café" },
      { name: "Poivre moulu", quantity: 0.5, unit: "c. à café" },
      { name: "Coriandre fraîche", quantity: 0.5, unit: "botte" },
      { name: "Persil", quantity: 0.5, unit: "botte" },
      { name: "Huile végétale", quantity: 4, unit: "c. à soupe" },
      { name: "Beurre", quantity: 30, unit: "g" },
      { name: "Sel", quantity: 2, unit: "c. à café" },
    ],
    steps: [
      {
        text: "La veille, mets les 100 g de pois chiches secs à tremper dans un grand volume d'eau froide.",
        minutes: 2,
      },
      {
        text: "Dans le bas du couscoussier, fais revenir les 2 oignons émincés dans les 4 cuillères d'huile avec le ras el-hanout, le curcuma, le poivre et la moitié du sel.",
        minutes: 5,
      },
      {
        text: "Ajoute les 2 tomates râpées, les herbes nouées en bouquet et les pois chiches égouttés. Couvre de 2 litres d'eau et laisse bouillir à couvert.",
        minutes: 25,
      },
      {
        text: "Mets les 500 g de semoule dans un grand plat, arrose-la d'un verre d'eau et d'un filet d'huile, et roule-la entre tes paumes pour bien séparer les grains.",
        minutes: 5,
      },
      {
        text: "Place la semoule dans le haut du couscoussier, au-dessus du bouillon, et laisse-la cuire à la vapeur, sans couvercle, jusqu'à ce que la vapeur traverse toute la semoule.",
        minutes: 15,
      },
      {
        text: "Verse la semoule dans le plat, arrose-la d'un verre d'eau salée, égrène-la à la fourchette puis avec les mains, et remets-la à la vapeur. Ajoute alors dans le bouillon les 300 g de carottes, les 2 navets et les 300 g de chou coupés en gros morceaux.",
        minutes: 15,
      },
      {
        text: "Ajoute dans le bouillon les 2 courgettes et le morceau de potiron coupés en gros morceaux : ils cuisent vite. Égrène la semoule une dernière fois et remets-la à la vapeur.",
        minutes: 15,
      },
      {
        text: "Mélange les 30 g de beurre à la semoule chaude. Dresse-la en dôme dans le plat, pose les légumes et les pois chiches dessus, et sers le bouillon à part.",
        minutes: 5,
      },
    ],
    leftoverIdeas: ["La semoule restante se réchauffe à la vapeur ou se mange froide en salade."],
  },
  {
    title: "Lentilles à la marocaine",
    validated: false,
    cuisine: "marocaine",
    mealTypes: ["lunch", "dinner"],
    prepMinutes: 10,
    cookMinutes: 40,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["végétarien", "petit budget"],
    reference: aValider("marocaine"),
    ingredients: [
      { name: "Lentilles vertes", quantity: 400, unit: "g" },
      { name: "Tomate", quantity: 3, unit: "pièce" },
      { name: "Oignon", quantity: 1, unit: "pièce" },
      { name: "Ail", quantity: 3, unit: "gousse" },
      { name: "Cumin moulu", quantity: 1, unit: "c. à café" },
      { name: "Paprika", quantity: 1, unit: "c. à café" },
      { name: "Coriandre fraîche", quantity: 0.5, unit: "botte" },
      { name: "Persil", quantity: 0.5, unit: "botte" },
      { name: "Huile d'olive", quantity: 4, unit: "c. à soupe" },
      { name: "Sel", quantity: 1, unit: "c. à café" },
      { name: "Poivre moulu", quantity: 0.25, unit: "c. à café" },
    ],
    steps: [
      {
        text: "Rince les 400 g de lentilles. Râpe les 3 tomates, hache l'oignon, écrase les 3 gousses d'ail et cisèle la coriandre et le persil.",
        minutes: 10,
      },
      {
        text: "Mets dans une marmite les lentilles, les tomates, l'oignon, l'ail, la moitié des herbes, les 4 cuillères d'huile d'olive, le cumin, le paprika, le sel et le poivre.",
        minutes: 3,
      },
      { text: "Ajoute 1 litre d'eau, mélange et porte à ébullition.", minutes: 5 },
      {
        text: "Baisse le feu et laisse cuire à couvert, en remuant de temps en temps, jusqu'à ce que les lentilles soient tendres et la sauce épaisse. Ajoute un peu d'eau si ça attache.",
        minutes: 35,
      },
      {
        text: "Ajoute le reste des herbes, goûte, rectifie le sel et sers chaud avec du pain.",
        minutes: 2,
      },
    ],
    leftoverIdeas: [
      "Les lentilles se gardent 3 jours au frigo et sont encore meilleures réchauffées.",
    ],
  },

  // ───────── Italie ─────────
  {
    title: "Spaghetti sauce tomate",
    validated: true,
    cuisine: "italienne",
    mealTypes: ["lunch", "dinner"],
    prepMinutes: 10,
    cookMinutes: 25,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["végétarien", "rapide"],
    reference:
      "« Spaghetti al pomodoro », blog italien hébergé par GialloZafferano (blog.giallozafferano.it/ilricettariotimoelavanda) : auteur à vérifier.",
    ingredients: [
      { name: "Spaghetti", quantity: 400, unit: "g" },
      { name: "Tomates pelées en boîte", quantity: 2, unit: "boîte de 400 g" },
      { name: "Oignon", quantity: 1, unit: "pièce" },
      { name: "Huile d'olive", quantity: 4, unit: "c. à soupe" },
      { name: "Piment sec", quantity: 0.25, unit: "c. à café", optional: true },
      { name: "Basilic", quantity: 1, unit: "botte" },
      { name: "Sel", quantity: 1, unit: "c. à café" },
    ],
    steps: [
      {
        text: "Émince finement l'oignon. Fais-le fondre doucement dans les 4 cuillères d'huile d'olive, à feu doux, jusqu'à ce qu'il soit transparent, sans le laisser brunir.",
        minutes: 7,
      },
      {
        text: "Ajoute les 2 boîtes de tomates pelées en les écrasant à la main ou à la fourchette, le sel et le piment si tu en mets.",
        minutes: 3,
      },
      {
        text: "Laisse mijoter à découvert à feu doux, en remuant de temps en temps, jusqu'à ce que la sauce épaississe.",
        minutes: 20,
      },
      {
        text: "Pendant ce temps, porte à ébullition une grande marmite d'eau bien salée et cuis les 400 g de spaghetti al dente, en suivant le temps du paquet.",
        minutes: 10,
      },
      {
        text: "Garde une louche d'eau de cuisson, égoutte les pâtes et verse-les dans la sauce.",
        minutes: 2,
      },
      {
        text: "Mélange 1 minute sur le feu avec l'eau de cuisson pour que la sauce enrobe bien les pâtes, puis ajoute les feuilles de basilic déchirées à la main.",
        minutes: 2,
      },
    ],
    leftoverIdeas: ["La sauce tomate se congèle très bien en petits pots."],
  },
  {
    title: "Spaghetti bolognaise",
    validated: true,
    cuisine: "italienne",
    mealTypes: ["lunch", "dinner"],
    prepMinutes: 20,
    cookMinutes: 140,
    needsCooking: true,
    servings: 6,
    difficulty: 2,
    tags: ["mijoté", "porc"],
    reference:
      "Accademia Italiana della Cucina, « Ricetta aggiornata del tradizionale ragù alla bolognese », déposée le 20 avril 2023 à la Chambre de commerce de Bologne.",
    ingredients: [
      { name: "Bœuf haché", quantity: 400, unit: "g" },
      { name: "Poitrine de porc fraîche", quantity: 150, unit: "g" },
      { name: "Oignon", quantity: 60, unit: "g" },
      { name: "Carotte", quantity: 60, unit: "g" },
      { name: "Céleri branche", quantity: 1, unit: "branche" },
      { name: "Vin rouge ou blanc sec", quantity: 200, unit: "ml" },
      { name: "Tomates pelées en boîte", quantity: 200, unit: "g" },
      { name: "Concentré de tomate", quantity: 1, unit: "c. à soupe" },
      { name: "Lait", quantity: 200, unit: "ml", optional: true },
      { name: "Cube de bouillon", quantity: 1, unit: "cube" },
      { name: "Huile d'olive", quantity: 3, unit: "c. à soupe" },
      { name: "Sel", quantity: 1, unit: "c. à café" },
      { name: "Poivre moulu", quantity: 0.25, unit: "c. à café" },
      { name: "Spaghetti", quantity: 600, unit: "g" },
    ],
    steps: [
      {
        text: "Hache finement au couteau les 60 g d'oignon, les 60 g de carotte et la branche de céleri : à Bologne, on évite le mixeur.",
        minutes: 10,
      },
      {
        text: "Hache ou coupe en tout petits morceaux les 150 g de poitrine de porc. Dans une casserole lourde, fais-la fondre dans les 3 cuillères d'huile d'olive.",
        minutes: 5,
      },
      {
        text: "Ajoute les légumes hachés et laisse-les fondre lentement à feu moyen-doux, en remuant avec une cuillère en bois. L'oignon ne doit surtout pas brûler.",
        minutes: 10,
      },
      {
        text: "Monte le feu, ajoute les 400 g de bœuf haché et cuis une dizaine de minutes en mélangeant bien, jusqu'à ce qu'il grésille.",
        minutes: 10,
      },
      {
        text: "Verse les 200 ml de vin et laisse-le s'évaporer complètement, jusqu'à ce qu'on ne sente plus l'odeur du vin.",
        minutes: 5,
      },
      {
        text: "Ajoute la cuillère de concentré et les 200 g de tomates pelées écrasées. Dissous le cube dans 500 ml d'eau chaude et verse-en une tasse dans la casserole.",
        minutes: 5,
      },
      {
        text: "Couvre et laisse cuire très doucement environ 2 heures, en ajoutant du bouillon chaud quand la sauce devient trop épaisse. À mi-cuisson, ajoute le lait si tu en mets et laisse-le s'absorber entièrement.",
        minutes: 120,
      },
      {
        text: "En fin de cuisson, rectifie le sel et le poivre : le ragù doit être d'un orange foncé, crémeux et enveloppant. Cuis les 600 g de spaghetti al dente et mélange-les au ragù.",
        minutes: 15,
      },
    ],
    leftoverIdeas: [
      "Le ragù se garde 3 jours au frigo et se congèle très bien.",
      "Les restes font une très bonne base de lasagnes.",
    ],
  },
  {
    title: "Pâtes au thon",
    validated: false,
    cuisine: "italienne",
    mealTypes: ["lunch", "dinner"],
    prepMinutes: 5,
    cookMinutes: 20,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["rapide", "placard"],
    reference: aValider("italienne"),
    ingredients: [
      { name: "Spaghetti", quantity: 400, unit: "g" },
      { name: "Thon en boîte", quantity: 2, unit: "boîte de 160 g" },
      { name: "Tomates pelées en boîte", quantity: 1, unit: "boîte de 400 g" },
      { name: "Ail", quantity: 2, unit: "gousse" },
      { name: "Huile d'olive", quantity: 3, unit: "c. à soupe" },
      { name: "Persil", quantity: 0.25, unit: "botte" },
      { name: "Piment sec", quantity: 0.25, unit: "c. à café", optional: true },
      { name: "Sel", quantity: 1, unit: "c. à café" },
    ],
    steps: [
      { text: "Porte à ébullition une grande marmite d'eau salée pour les pâtes.", minutes: 8 },
      {
        text: "Écrase légèrement les 2 gousses d'ail. Fais-les dorer doucement dans les 3 cuillères d'huile d'olive avec le piment, sans les laisser brûler.",
        minutes: 2,
      },
      {
        text: "Ajoute la boîte de tomates pelées en les écrasant, puis le sel, et laisse cuire à feu moyen.",
        minutes: 10,
      },
      {
        text: "Pendant ce temps, cuis les 400 g de spaghetti al dente en suivant le temps du paquet.",
        minutes: 10,
      },
      {
        text: "Égoutte les 2 boîtes de thon, émiette-le et ajoute-le à la sauce. Réchauffe 3 minutes sans trop remuer pour garder des morceaux.",
        minutes: 3,
      },
      {
        text: "Égoutte les pâtes, mélange-les à la sauce et ajoute le persil haché au moment de servir.",
        minutes: 2,
      },
    ],
    leftoverIdeas: ["Froides, elles font une salade de pâtes pour le lendemain midi."],
  },

  // ───────── Chine ─────────
  {
    title: "Riz cantonais",
    validated: true,
    cuisine: "chinoise",
    mealTypes: ["lunch", "dinner"],
    prepMinutes: 15,
    cookMinutes: 15,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["rapide", "anti-gaspi", "porc"],
    reference:
      "The Woks of Life (famille Leung, Judy Leung née à Shanghai), « Young Chow Fried Rice » : thewoksoflife.com/young-chow-fried-rice. Le porc laqué (cha siu) de la recette d'origine est remplacé par du jambon, introuvable à Abidjan.",
    ingredients: [
      { name: "Riz", quantity: 400, unit: "g" },
      { name: "Huile végétale", quantity: 3, unit: "c. à soupe" },
      { name: "Œufs", quantity: 2, unit: "pièce" },
      { name: "Crevettes", quantity: 110, unit: "g" },
      { name: "Oignon", quantity: 1, unit: "pièce" },
      { name: "Jambon cuit", quantity: 220, unit: "g" },
      { name: "Petits pois en boîte", quantity: 110, unit: "g" },
      { name: "Sel", quantity: 1.5, unit: "c. à café" },
      { name: "Sucre en poudre", quantity: 0.25, unit: "c. à café" },
      { name: "Oignon vert", quantity: 0.25, unit: "botte" },
      { name: "Laitue", quantity: 0.3, unit: "pièce" },
      { name: "Poivre moulu", quantity: 0.1, unit: "c. à café" },
    ],
    steps: [
      {
        text: "La veille (ou plusieurs heures avant), cuis les 400 g de riz avec un peu moins d'eau que d'habitude. Étale-le sur un plat pour qu'il refroidisse et sépare les grains avec une fourchette ou les mains.",
        minutes: 20,
      },
      {
        text: "Bats les 2 œufs. Fais-les cuire en œufs brouillés dans 1 cuillère d'huile, à feu moyen à vif, puis réserve-les.",
        minutes: 3,
      },
      {
        text: "Plonge les 110 g de crevettes décortiquées 1 minute dans de l'eau bouillante, égoutte-les et réserve.",
        minutes: 3,
      },
      {
        text: "Coupe l'oignon et les 220 g de jambon en petits dés. Émince l'oignon vert et coupe la laitue en fines lanières.",
        minutes: 5,
      },
      {
        text: "Fais chauffer les 2 cuillères d'huile restantes à feu vif dans un wok ou une grande poêle. Fais revenir l'oignon jusqu'à ce qu'il soit transparent, puis ajoute le jambon 30 secondes.",
        minutes: 3,
      },
      {
        text: "Ajoute le riz et fais-le sauter 2 minutes en cassant les mottes. Ajoute les crevettes et les 110 g de petits pois, et saute encore 2 minutes.",
        minutes: 4,
      },
      {
        text: "Saupoudre le sel et la pincée de sucre et mélange. Si le riz semble sec, ajoute un tout petit peu d'eau.",
        minutes: 1,
      },
      {
        text: "Ajoute les œufs, l'oignon vert, la laitue et le poivre, et saute juste jusqu'à ce que la laitue ramollisse. Sers aussitôt.",
        minutes: 1,
      },
    ],
    leftoverIdeas: ["C'est la recette idéale pour finir le riz de la veille."],
  },

  // ───────── Inde ─────────
  {
    title: "Dal tadka",
    validated: true,
    cuisine: "indienne",
    mealTypes: ["lunch", "dinner"],
    prepMinutes: 10,
    cookMinutes: 40,
    needsCooking: true,
    servings: 4,
    difficulty: 1,
    tags: ["végétarien"],
    reference: "Ranveer Brar, chef indien, « Dal Tadka » : ranveerbrar.com/recipes/dal-tadka",
    ingredients: [
      { name: "Pois d'Angole cassés (toor dal)", quantity: 200, unit: "g" },
      { name: "Haricots urad cassés (urad dal)", quantity: 15, unit: "g" },
      { name: "Sel", quantity: 1.5, unit: "c. à café" },
      { name: "Piment rouge en poudre", quantity: 1.5, unit: "c. à café" },
      { name: "Curcuma", quantity: 0.75, unit: "c. à café" },
      { name: "Asa-fœtida", quantity: 0.5, unit: "c. à café" },
      { name: "Gingembre", quantity: 10, unit: "g" },
      { name: "Ail", quantity: 3, unit: "gousse" },
      { name: "Piment frais", quantity: 2, unit: "pièce" },
      { name: "Huile végétale", quantity: 1, unit: "c. à soupe" },
      { name: "Graines de fenugrec", quantity: 0.1, unit: "c. à café" },
      { name: "Oignon", quantity: 1, unit: "pièce" },
      { name: "Feuilles de curry", quantity: 2, unit: "brin", optional: true },
      { name: "Coriandre moulue", quantity: 0.5, unit: "c. à café" },
      { name: "Tomate", quantity: 1, unit: "pièce" },
      { name: "Ghee", quantity: 2.5, unit: "c. à soupe" },
      { name: "Graines de cumin", quantity: 1.5, unit: "c. à café" },
      { name: "Piment sec", quantity: 10, unit: "pièce" },
      { name: "Riz", quantity: 300, unit: "g" },
    ],
    steps: [
      {
        text: "Lave les 200 g de toor dal et les 15 g d'urad dal. Mets-les à cuire dans 1,5 litre d'eau avec le sel, 1 cuillère à café de piment rouge en poudre, une demi-cuillère de curcuma et un quart de cuillère d'asa-fœtida.",
        minutes: 5,
      },
      {
        text: "Cuis jusqu'à ce que les dals soient fondants : 2 à 3 sifflets en autocuiseur, ou environ 40 minutes à feu moyen dans une marmite, en remuant de temps en temps. Écrase-les ensuite à la louche.",
        minutes: 40,
      },
      {
        text: "Pendant ce temps, pile les 10 g de gingembre, les 3 gousses d'ail et les 2 piments frais en pâte grossière. Hache l'oignon et coupe la tomate en dés.",
        minutes: 5,
      },
      {
        text: "Fais chauffer la cuillère d'huile, ajoute le fenugrec et la pâte gingembre-ail, et remue 1 minute.",
        minutes: 1,
      },
      {
        text: "Ajoute l'oignon et fais-le revenir 2 à 3 minutes jusqu'à ce qu'il soit transparent. Ajoute les feuilles de curry, le reste du curcuma, un quart de cuillère de piment rouge, la coriandre moulue, la tomate et un peu d'eau. Cuis jusqu'à ce que la tomate fonde.",
        minutes: 6,
      },
      {
        text: "Verse les dals écrasés dans ce mélange, rectifie le sel et laisse frémir quelques minutes. Fais cuire le riz à côté.",
        minutes: 5,
      },
      {
        text: "Pour la touche finale, fais chauffer les 2,5 cuillères de ghee. Quand il est chaud, ajoute les graines de cumin et laisse-les crépiter quelques secondes.",
        minutes: 1,
      },
      {
        text: "Ajoute les piments secs, le reste de l'asa-fœtida et le dernier quart de cuillère de piment rouge, remue quelques secondes et verse aussitôt sur le dal. Sers bien chaud avec le riz.",
        minutes: 1,
      },
    ],
    leftoverIdeas: [
      "Le dal épaissit au frigo : il suffit d'ajouter un peu d'eau en le réchauffant.",
    ],
  },
];

// ───────── Prix réellement relevés (sources publiées), en FCFA par kg, marchés d'Abidjan ─────────

const NOTEOCPV =
  "OCPV, note de conjoncture n° 41, marchés d'Abidjan (Adjamé, Abobo, Koumassi, Bingerville, Cocody Cocovico), semaine du 5 au 11 octobre 2026";
const SIKAFINANCE =
  "Sikafinance, liste des prix des produits de consommation, Abidjan, 27 septembre 2026";

/** Prix minimum et maximum relevés par l'OCPV sur les marchés d'Abidjan. */
function ocpv(minimum: number, maximum: number, produit = ""): PrixDepart[] {
  const precision = produit ? ` (${produit})` : "";
  return [
    {
      unit: "kg",
      priceFcfa: minimum,
      placeType: "market",
      source: "team",
      observedAt: "2026-10-11",
      reference: `${NOTEOCPV}, prix minimum${precision}`,
    },
    {
      unit: "kg",
      priceFcfa: maximum,
      placeType: "market",
      source: "team",
      observedAt: "2026-10-11",
      reference: `${NOTEOCPV}, prix maximum${precision}`,
    },
  ];
}

function sikafinance(prix: number, produit = ""): PrixDepart {
  const precision = produit ? ` (${produit})` : "";
  return {
    unit: "kg",
    priceFcfa: prix,
    placeType: "market",
    source: "team",
    observedAt: "2026-09-27",
    reference: `${SIKAFINANCE}${precision}`,
  };
}

/**
 * Relevés réels par ingrédient. Ils s'ajoutent aux estimations ci-dessus et passent toujours
 * avant elles tant qu'ils ont moins de 90 jours (CLAUDE.md §11).
 */
export const relevesDepart: Record<string, PrixDepart[]> = {
  Riz: ocpv(500, 650, "riz de grande consommation"),
  "Banane plantain": [...ocpv(460, 1240), sikafinance(450)],
  // L'OCPV et Sikafinance relèvent l'aubergine locale N'drowa
  Aubergine: [...ocpv(490, 960, "aubergine N'drowa"), sikafinance(500, "aubergine N'drowa")],
  Gombo: ocpv(730, 1470, "gombo frais"),
  Oignon: [
    ...ocpv(800, 800, "oignon violet"),
    ...ocpv(650, 800, "oignon Holland"),
    sikafinance(750, "oignon blanc"),
  ],
  "Piment frais": [...ocpv(530, 1090), sikafinance(700)],
  Tomate: [...ocpv(500, 1000, "tomate SODEFEL"), sikafinance(650, "tomate type salade")],
  "Graine de palme": [...ocpv(250, 500), sikafinance(350)],
  Gingembre: [sikafinance(2500)],
  Citron: [sikafinance(350)],
  Chou: [sikafinance(700)],
  Poivron: [sikafinance(800)],
  Navet: [sikafinance(700)],
  Courgette: [sikafinance(600)],
  "Pomme de terre": [sikafinance(700)],
  Carotte: [sikafinance(1300)],
};
