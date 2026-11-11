// Recettes ajoutées par l'équipe (générées par IA, relues et validées) et les ingrédients qui
// manquaient au catalogue. Les allergènes de chaque ingrédient sont ce qui protège les familles
// (règle 2) : ils sont à relire avec soin. Les prix sont des estimations, affichées comme telles,
// en attendant de vrais relevés.

import type { IngredientDepart, RecetteDepart } from "./donnees-depart.ts";
import { nouvellesRecettes } from "./recettes-ia-donnees.ts";

/** Date des estimations de prix. */
const ESTIME = "2026-11-11";

type Lieu = "market" | "supermarket" | "shop";

/** Durées de conservation en jours ; null quand le lieu ne convient pas (pas de riz au frigo). */
function conservation(jours: { ambiant?: number; frigo?: number; congelateur?: number }) {
  return {
    ambiant: jours.ambiant ?? null,
    frigo: jours.frigo ?? null,
    congelateur: jours.congelateur ?? null,
  };
}

/** Prix estimé par l'équipe, affiché comme estimation tant qu'aucun relevé ne le remplace. */
function estimation(unit: string, priceFcfa: number, placeType: Lieu) {
  return {
    unit,
    priceFcfa,
    placeType,
    source: "estimate" as const,
    observedAt: ESTIME,
    reference: "Estimation de l'équipe (novembre 2026), à remplacer par un relevé.",
  };
}

/** Toute l'année : ces produits se trouvent en toute saison à Abidjan. */
const TOUTELANNEE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const ingredientsIa: IngredientDepart[] = [
  {
    name: "Tilapia",
    category: "poisson",
    allergens: ["poisson"],
    shelfLifeDays: conservation({ frigo: 2, congelateur: 90 }),
    seasonalMonths: TOUTELANNEE,
    storageTip: "Au frigo, à cuisiner dans les 2 jours ; sinon au congélateur.",
    units: [{ label: "pièce", grams: 400 }],
    defaultUnit: "pièce",
    prices: [estimation("pièce", 1500, "market")],
  },
  {
    name: "Maquereau",
    category: "poisson",
    allergens: ["poisson"],
    shelfLifeDays: conservation({ frigo: 2, congelateur: 90 }),
    seasonalMonths: TOUTELANNEE,
    units: [{ label: "pièce", grams: 300 }],
    defaultUnit: "pièce",
    prices: [estimation("pièce", 1000, "market")],
  },
  {
    name: "Sardine fraîche",
    category: "poisson",
    allergens: ["poisson"],
    shelfLifeDays: conservation({ frigo: 1, congelateur: 60 }),
    seasonalMonths: TOUTELANNEE,
    units: [{ label: "tas", grams: 500 }],
    defaultUnit: "tas",
    prices: [estimation("tas", 1000, "market")],
  },
  {
    name: "Bœuf",
    category: "viande",
    allergens: [],
    shelfLifeDays: conservation({ frigo: 2, congelateur: 90 }),
    seasonalMonths: TOUTELANNEE,
    storageTip: "Au frigo, à cuisiner dans les 2 jours ; sinon au congélateur.",
    units: [],
    defaultUnit: "kg",
    prices: [estimation("kg", 4000, "market")],
  },
  {
    name: "Lardons",
    category: "porc",
    allergens: [],
    shelfLifeDays: conservation({ frigo: 5, congelateur: 60 }),
    seasonalMonths: TOUTELANNEE,
    units: [{ label: "barquette de 200 g", grams: 200 }],
    defaultUnit: "barquette de 200 g",
    prices: [estimation("barquette de 200 g", 2000, "supermarket")],
  },
  {
    name: "Igname",
    category: "féculent",
    allergens: [],
    shelfLifeDays: conservation({ ambiant: 30 }),
    seasonalMonths: TOUTELANNEE,
    storageTip: "Au sec et à l'ombre, pas au frigo.",
    units: [{ label: "tubercule", grams: 2000 }],
    defaultUnit: "tubercule",
    prices: [estimation("kg", 600, "market")],
  },
  {
    name: "Feuille de manioc",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation({ frigo: 2, congelateur: 60 }),
    seasonalMonths: TOUTELANNEE,
    units: [{ label: "tas", grams: 300 }],
    defaultUnit: "tas",
    prices: [estimation("tas", 200, "market")],
  },
  {
    name: "Feuille d'épinard",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation({ frigo: 3 }),
    seasonalMonths: TOUTELANNEE,
    units: [{ label: "botte", grams: 250 }],
    defaultUnit: "botte",
    prices: [estimation("botte", 250, "market")],
  },
  {
    name: "Concombre",
    category: "légume",
    allergens: [],
    shelfLifeDays: conservation({ ambiant: 3, frigo: 7 }),
    seasonalMonths: TOUTELANNEE,
    units: [{ label: "pièce", grams: 300 }],
    defaultUnit: "pièce",
    prices: [estimation("pièce", 200, "market")],
  },
  {
    name: "Haricots rouges",
    category: "légumineuse",
    allergens: [],
    shelfLifeDays: conservation({ ambiant: 365 }),
    seasonalMonths: TOUTELANNEE,
    units: [{ label: "sachet de 500 g", grams: 500 }],
    defaultUnit: "sachet de 500 g",
    prices: [estimation("sachet de 500 g", 700, "market")],
  },
  {
    name: "Haricots blancs",
    category: "légumineuse",
    allergens: [],
    shelfLifeDays: conservation({ ambiant: 365 }),
    seasonalMonths: TOUTELANNEE,
    units: [{ label: "sachet de 500 g", grams: 500 }],
    defaultUnit: "sachet de 500 g",
    prices: [estimation("sachet de 500 g", 700, "market")],
  },
  {
    name: "Arachide",
    category: "oléagineux",
    allergens: ["arachide"],
    shelfLifeDays: conservation({ ambiant: 90 }),
    seasonalMonths: TOUTELANNEE,
    storageTip: "Au sec, dans une boîte fermée.",
    units: [{ label: "tas", grams: 250 }],
    defaultUnit: "tas",
    prices: [estimation("tas", 300, "market")],
  },
  {
    name: "Noix de coco râpée",
    category: "fruit",
    allergens: [],
    shelfLifeDays: conservation({ ambiant: 180 }),
    seasonalMonths: TOUTELANNEE,
    units: [{ label: "sachet de 100 g", grams: 100 }],
    defaultUnit: "sachet de 100 g",
    prices: [estimation("sachet de 100 g", 500, "supermarket")],
  },
  {
    name: "Levure chimique",
    category: "épicerie",
    allergens: [],
    shelfLifeDays: conservation({ ambiant: 365 }),
    seasonalMonths: TOUTELANNEE,
    units: [{ label: "sachet de 10 g", grams: 10 }],
    defaultUnit: "sachet de 10 g",
    prices: [estimation("sachet de 10 g", 100, "supermarket")],
  },
  {
    name: "Fromage râpé",
    category: "produit laitier",
    allergens: ["lait"],
    shelfLifeDays: conservation({ frigo: 14, congelateur: 60 }),
    seasonalMonths: TOUTELANNEE,
    units: [{ label: "sachet de 200 g", grams: 200 }],
    defaultUnit: "sachet de 200 g",
    prices: [estimation("sachet de 200 g", 2500, "supermarket")],
  },
  {
    name: "Mélange d'épices",
    category: "épice",
    allergens: [],
    shelfLifeDays: conservation({ ambiant: 365 }),
    seasonalMonths: TOUTELANNEE,
    units: [{ label: "sachet de 50 g", grams: 50 }],
    defaultUnit: "sachet de 50 g",
    prices: [estimation("sachet de 50 g", 300, "market")],
  },
];

/** Noms des recettes écrits autrement que dans le catalogue. */
const NOMS: Record<string, string> = {
  "Poivre noir": "Poivre moulu",
  "Huile de palme rouge": "Huile de palme",
  "Tomate concentrée": "Concentré de tomate",
  "Tomate pelée en boîte": "Tomates pelées en boîte",
  Sucre: "Sucre en poudre",
  "Semoule de blé": "Semoule de couscous",
  Lentilles: "Lentilles vertes",
  "Pois chiches": "Pois chiches secs",
  Pâtes: "Spaghetti",
  Porc: "Poitrine de porc fraîche",
};

/** Unités écrites autrement que dans le catalogue, pour un ingrédient ou pour tous (« * »). */
const UNITES: Record<string, Record<string, string>> = {
  "*": { L: "l" },
  Poulet: { pièce: "poulet entier" },
  "Banane plantain": { pièce: "doigt" },
};

const sansAccents = (texte: string) => texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Une recette au format du catalogue : noms et unités du catalogue, validée, et l'étiquette « four »
 * quand une étape l'utilise (le code écarte alors la recette pour un foyer sans four).
 */
function versCatalogue(recette: RecetteDepart): RecetteDepart {
  const auFour = recette.steps.some((etape) => /\bfour\b/i.test(etape.text));
  return {
    ...recette,
    validated: true,
    tags: auFour && !recette.tags.includes("four") ? [...recette.tags, "four"] : recette.tags,
    ingredients: recette.ingredients.map((ligne) => {
      const name = NOMS[ligne.name] ?? ligne.name;
      const unit = UNITES[name]?.[ligne.unit] ?? UNITES["*"][ligne.unit] ?? ligne.unit;
      return { ...ligne, name, unit };
    }),
  };
}

/**
 * Les recettes à ajouter, sans celles dont le titre existe déjà dans le catalogue de l'équipe :
 * une recette existante n'est jamais remplacée.
 */
export function recettesIa(titresExistants: string[]): RecetteDepart[] {
  const deja = new Set(titresExistants.map(sansAccents));
  return nouvellesRecettes.filter((r) => !deja.has(sansAccents(r.title))).map(versCatalogue);
}
