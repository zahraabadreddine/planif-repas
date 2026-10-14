// Données de départ des comptes, foyers, quartiers et magasins. Toutes fictives.
// Aucun mot de passe ici : ils viennent des variables SEEDADMINPASSWORD et SEEDDEMOPASSWORD
// du fichier .env, puis sont hachés avec bcrypt par le seed.

import type {
  AgeGroup,
  PlaceType,
  RestrictionType,
  Role,
  Severity,
  StorageLocation,
} from "@prisma/client";

export type QuartierDepart = { commune: string; name: string; latitude: number; longitude: number };

// Communes citées dans le questionnaire. Coordonnées : centre approximatif, à vérifier.
export const quartiersDepart: QuartierDepart[] = [
  { commune: "Yopougon", name: "Yopougon", latitude: 5.333, longitude: -4.083 },
  { commune: "Cocody", name: "Cocody", latitude: 5.354, longitude: -3.99 },
  { commune: "Abobo", name: "Abobo", latitude: 5.42, longitude: -4.02 },
  { commune: "Marcory", name: "Marcory", latitude: 5.303, longitude: -3.98 },
  { commune: "Treichville", name: "Treichville", latitude: 5.292, longitude: -4.01 },
  { commune: "Adjamé", name: "Adjamé", latitude: 5.36, longitude: -4.025 },
  { commune: "Koumassi", name: "Koumassi", latitude: 5.297, longitude: -3.95 },
  { commune: "Songon", name: "Songon", latitude: 5.31, longitude: -4.26 },
  { commune: "Bingerville", name: "Bingerville", latitude: 5.355, longitude: -3.885 },
];

export type MagasinDepart = {
  name: string;
  type: PlaceType;
  quartier: { commune: string; name: string };
  address: string;
  latitude: number;
  longitude: number;
};

const quartier = (commune: string) => ({ commune, name: commune });

// Lieux connus d'Abidjan. Coordonnées approximatives, à vérifier sur place avant le pilote.
// Les boutiques et le supermarché de Yopougon sont des emplacements génériques à préciser.
export const magasinsDepart: MagasinDepart[] = [
  {
    name: "Grand marché de Yopougon",
    type: "market",
    quartier: quartier("Yopougon"),
    address: "Yopougon, à préciser",
    latitude: 5.335,
    longitude: -4.085,
  },
  {
    name: "Marché d'Adjamé",
    type: "market",
    quartier: quartier("Adjamé"),
    address: "Adjamé, à préciser",
    latitude: 5.355,
    longitude: -4.022,
  },
  {
    name: "Grand marché de Treichville",
    type: "market",
    quartier: quartier("Treichville"),
    address: "Treichville, à préciser",
    latitude: 5.296,
    longitude: -4.006,
  },
  {
    name: "Marché de Cocody",
    type: "market",
    quartier: quartier("Cocody"),
    address: "Cocody, à préciser",
    latitude: 5.343,
    longitude: -3.997,
  },
  {
    name: "Grand marché d'Abobo",
    type: "market",
    quartier: quartier("Abobo"),
    address: "Abobo, à préciser",
    latitude: 5.418,
    longitude: -4.017,
  },
  {
    name: "Marché de Marcory",
    type: "market",
    quartier: quartier("Marcory"),
    address: "Marcory, à préciser",
    latitude: 5.304,
    longitude: -3.983,
  },
  {
    name: "Grand marché de Koumassi",
    type: "market",
    quartier: quartier("Koumassi"),
    address: "Koumassi, à préciser",
    latitude: 5.293,
    longitude: -3.953,
  },
  {
    name: "Marché de Bingerville",
    type: "market",
    quartier: quartier("Bingerville"),
    address: "Bingerville, à préciser",
    latitude: 5.356,
    longitude: -3.889,
  },
  {
    name: "Carrefour Playce Marcory",
    type: "supermarket",
    quartier: quartier("Marcory"),
    address: "Marcory, à préciser",
    latitude: 5.3,
    longitude: -3.978,
  },
  {
    name: "Sococé Deux-Plateaux",
    type: "supermarket",
    quartier: quartier("Cocody"),
    address: "Cocody Deux-Plateaux, à préciser",
    latitude: 5.373,
    longitude: -3.997,
  },
  {
    name: "Cash Center Adjamé",
    type: "supermarket",
    quartier: quartier("Adjamé"),
    address: "Adjamé, à préciser",
    latitude: 5.358,
    longitude: -4.02,
  },
  {
    name: "Supermarché de Yopougon",
    type: "supermarket",
    quartier: quartier("Yopougon"),
    address: "Yopougon, à préciser",
    latitude: 5.338,
    longitude: -4.075,
  },
  {
    name: "Boutique de quartier Yopougon",
    type: "shop",
    quartier: quartier("Yopougon"),
    address: "Yopougon, à préciser",
    latitude: 5.331,
    longitude: -4.08,
  },
  {
    name: "Boutique de quartier Cocody",
    type: "shop",
    quartier: quartier("Cocody"),
    address: "Cocody, à préciser",
    latitude: 5.356,
    longitude: -3.988,
  },
  {
    name: "Boutique de quartier Abobo",
    type: "shop",
    quartier: quartier("Abobo"),
    address: "Abobo, à préciser",
    latitude: 5.421,
    longitude: -4.022,
  },
];

export type RestrictionDepart = { type: RestrictionType; value: string; severity: Severity };

export type MembreDepart = {
  label: string;
  ageGroup: AgeGroup;
  restrictions: RestrictionDepart[];
};

export type StockDepart = {
  ingredient: string;
  quantity: number;
  unit: string;
  location: StorageLocation;
  // Nombre de jours depuis l'achat : la date de péremption en est déduite par le code
  acheteIlYaJours: number;
};

export type FoyerDepart = {
  name: string;
  weeklyBudgetFcfa: number;
  equipment: string[];
  quartier: { commune: string; name: string } | null;
  members: MembreDepart[];
  stock: StockDepart[];
};

export type CompteDepart = {
  email: string;
  fullName: string;
  role: Role;
  // Variable d'environnement qui contient le mot de passe de ce compte
  motDePasse: "SEEDADMINPASSWORD" | "SEEDDEMOPASSWORD";
  consentHealth: boolean;
  foyer: FoyerDepart | null;
};

const allergieArachide: RestrictionDepart = {
  type: "allergy",
  value: "arachide",
  severity: "strict",
};

export const compteAdmin: CompteDepart = {
  email: "admin@umami.test",
  fullName: "Admin Umami",
  role: "admin",
  motDePasse: "SEEDADMINPASSWORD",
  consentHealth: false,
  foyer: null,
};

export const comptesTest: CompteDepart[] = [
  {
    email: "test.arachide@umami.test",
    fullName: "Foyer Test Arachide",
    role: "user",
    motDePasse: "SEEDDEMOPASSWORD",
    consentHealth: true,
    foyer: {
      name: "Foyer test arachide",
      weeklyBudgetFcfa: 20000,
      equipment: ["gaz"],
      quartier: null,
      members: [
        { label: "Adulte 1", ageGroup: "adult", restrictions: [] },
        { label: "Adulte 2", ageGroup: "adult", restrictions: [] },
        { label: "Enfant 1", ageGroup: "child", restrictions: [allergieArachide] },
      ],
      stock: [],
    },
  },
  {
    email: "test.simple@umami.test",
    fullName: "Foyer Test Simple",
    role: "user",
    motDePasse: "SEEDDEMOPASSWORD",
    consentHealth: false,
    foyer: {
      name: "Foyer test simple",
      weeklyBudgetFcfa: 15000,
      equipment: ["gaz", "four"],
      quartier: null,
      members: [
        { label: "Adulte 1", ageGroup: "adult", restrictions: [] },
        { label: "Adulte 2", ageGroup: "adult", restrictions: [] },
      ],
      stock: [],
    },
  },
];

/** Foyer du scénario de démonstration (CLAUDE.md §1), réinitialisable par npm run demo:reset. */
export const compteAminata: CompteDepart = {
  email: "aminata@umami.test",
  fullName: "Aminata Démo",
  role: "user",
  motDePasse: "SEEDDEMOPASSWORD",
  consentHealth: true,
  foyer: {
    name: "Foyer d'Aminata",
    weeklyBudgetFcfa: 25000,
    equipment: ["gaz"],
    quartier: { commune: "Yopougon", name: "Yopougon" },
    members: [
      { label: "Adulte 1", ageGroup: "adult", restrictions: [] },
      { label: "Adulte 2", ageGroup: "adult", restrictions: [] },
      { label: "Enfant 1", ageGroup: "child", restrictions: [allergieArachide] },
      { label: "Enfant 2", ageGroup: "child", restrictions: [] },
    ],
    stock: [
      // Achetées il y a 9 jours, conservées 10 jours au frigo : à consommer dès demain
      {
        ingredient: "Aubergine",
        quantity: 4,
        unit: "pièce",
        location: "fridge",
        acheteIlYaJours: 9,
      },
      { ingredient: "Tomate", quantity: 1, unit: "tas", location: "fridge", acheteIlYaJours: 2 },
      { ingredient: "Oignon", quantity: 1, unit: "tas", location: "pantry", acheteIlYaJours: 3 },
      { ingredient: "Riz", quantity: 2, unit: "kg", location: "pantry", acheteIlYaJours: 3 },
      { ingredient: "Œufs", quantity: 6, unit: "pièce", location: "pantry", acheteIlYaJours: 2 },
    ],
  },
};
