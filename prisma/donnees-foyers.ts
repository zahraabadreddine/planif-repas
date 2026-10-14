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

// Coordonnées : centre approximatif de la commune, à vérifier avec le questionnaire.
export const quartiersDepart: QuartierDepart[] = [
  { commune: "Yopougon", name: "Yopougon", latitude: 5.333, longitude: -4.083 },
];

export type MagasinDepart = {
  name: string;
  type: PlaceType;
  quartier: { commune: string; name: string };
  address: string;
  latitude: number;
  longitude: number;
};

// Les magasins du pilote seront ajoutés avec les réponses au questionnaire.
export const magasinsDepart: MagasinDepart[] = [];

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
