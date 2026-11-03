import { z } from "zod";
import { ageEnAnnees, dateDuJour } from "@/lib/foyer/age";

// Schéma d'un membre du foyer (EF-03) et vocabulaire des allergies et régimes.
// Les valeurs des allergènes sont les mêmes que celles des ingrédients du catalogue :
// c'est ce qui permet au planificateur de filtrer les recettes (règle 2).

/** Les 14 allergènes majeurs de la réglementation européenne. */
export const ALLERGENES = [
  { valeur: "arachide", libelle: "Arachide" },
  { valeur: "fruits-a-coque", libelle: "Fruits à coque" },
  { valeur: "lait", libelle: "Lait" },
  { valeur: "oeuf", libelle: "Œuf" },
  { valeur: "poisson", libelle: "Poisson" },
  { valeur: "crustaces", libelle: "Crustacés" },
  { valeur: "mollusques", libelle: "Mollusques" },
  { valeur: "gluten", libelle: "Gluten" },
  { valeur: "soja", libelle: "Soja" },
  { valeur: "sesame", libelle: "Sésame" },
  { valeur: "celeri", libelle: "Céleri" },
  { valeur: "moutarde", libelle: "Moutarde" },
  { valeur: "sulfites", libelle: "Sulfites" },
  { valeur: "lupin", libelle: "Lupin" },
] as const;

export type Allergene = (typeof ALLERGENES)[number]["valeur"];

/** Régimes, toujours stricts : végétarien écarte viande, volaille, poisson et fruits de mer. */
export const REGIMES = [
  { valeur: "vegetarien", libelle: "Végétarien" },
  { valeur: "sans-porc", libelle: "Sans porc" },
] as const;

export type Regime = (typeof REGIMES)[number]["valeur"];

export const TRANCHES = [
  { valeur: "baby", libelle: "Bébé", detail: "0-2 ans" },
  { valeur: "child", libelle: "Enfant", detail: "3-11 ans" },
  { valeur: "teen", libelle: "Ado", detail: "12-17 ans" },
  { valeur: "adult", libelle: "Adulte", detail: "18-64 ans" },
  { valeur: "senior", libelle: "Senior", detail: "65 ans et plus" },
] as const;

type Tranche = (typeof TRANCHES)[number]["valeur"];

/** Minuscules, sans accents ni espaces superflus : « Cacahuètes » devient « cacahuetes ». */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/gi, "oe")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Mots courants rattachés à un allergène majeur (au singulier, normalisés).
const SYNONYMES: Record<string, Allergene> = {
  arachide: "arachide",
  cacahuete: "arachide",
  cacahouete: "arachide",
  "pate d'arachide": "arachide",
  "beurre de cacahuete": "arachide",
  "fruit a coque": "fruits-a-coque",
  noix: "fruits-a-coque",
  amande: "fruits-a-coque",
  noisette: "fruits-a-coque",
  "noix de cajou": "fruits-a-coque",
  cajou: "fruits-a-coque",
  pistache: "fruits-a-coque",
  lait: "lait",
  lactose: "lait",
  fromage: "lait",
  beurre: "lait",
  yaourt: "lait",
  creme: "lait",
  oeuf: "oeuf",
  poisson: "poisson",
  thon: "poisson",
  sardine: "poisson",
  crustace: "crustaces",
  crevette: "crustaces",
  crabe: "crustaces",
  langouste: "crustaces",
  homard: "crustaces",
  mollusque: "mollusques",
  huitre: "mollusques",
  moule: "mollusques",
  calamar: "mollusques",
  escargot: "mollusques",
  gluten: "gluten",
  ble: "gluten",
  farine: "gluten",
  orge: "gluten",
  seigle: "gluten",
  soja: "soja",
  sesame: "sesame",
  tahine: "sesame",
  celeri: "celeri",
  moutarde: "moutarde",
  sulfite: "sulfites",
  lupin: "lupin",
};

/** Reconnaît un allergène majeur dans un mot tapé par le parent (« Cacahuètes » → arachide). */
export function reconnaitreAllergene(texte: string): Allergene | null {
  const mot = normaliser(texte);
  return SYNONYMES[mot] ?? SYNONYMES[mot.replace(/(s|x)$/, "")] ?? null;
}

const valeursAllergenes = ALLERGENES.map((a) => a.valeur) as [Allergene, ...Allergene[]];
const valeursRegimes = REGIMES.map((r) => r.valeur) as [Regime, ...Regime[]];
const valeursTranches = TRANCHES.map((t) => t.valeur) as [Tranche, ...Tranche[]];

const sansDoublon = <T>(liste: T[]) => new Set(liste).size === liste.length;

/** Date AAAA-MM-JJ qui existe vraiment (refuse le 31 février). */
function dateValide(texte: string): boolean {
  const date = new Date(`${texte}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(texte);
}

// strictObject : un champ en trop (householdId, id…) est refusé, le foyer vient de la session.
export const membreSchema = z
  .strictObject({
    label: z
      .string({ error: "Le surnom est obligatoire." })
      .trim()
      .min(1, { error: "Le surnom est obligatoire." })
      .max(30, { error: "Le surnom est trop long (30 caractères maximum)." }),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Cette date n'est pas valide." })
      .refine(dateValide, { error: "Cette date n'est pas valide." })
      .refine((date) => date <= dateDuJour(), { error: "La date ne peut pas être dans le futur." })
      .refine((date) => ageEnAnnees(date, dateDuJour()) <= 120, {
        error: "Vérifie l'année de naissance.",
      })
      .nullable(),
    ageGroup: z.enum(valeursTranches, { error: "Choisis une tranche d'âge." }).nullable(),
    allergies: z
      .array(z.enum(valeursAllergenes, { error: "Cette allergie n'est pas proposée." }))
      .refine(sansDoublon, { error: "Chaque allergie ne peut être choisie qu'une fois." }),
    // Autres allergies : de préférence un ingrédient du catalogue, sinon un aliment absent des recettes
    autresAllergies: z
      .array(
        z
          .string()
          .trim()
          .min(2, { error: "Écris au moins 2 lettres." })
          .max(40, { error: "40 caractères maximum." }),
      )
      .max(10, { error: "10 autres allergies maximum." })
      .refine((liste) => sansDoublon(liste.map(normaliser)), {
        error: "Cette allergie est déjà dans la liste.",
      }),
    regimes: z
      .array(z.enum(valeursRegimes, { error: "Ce régime n'est pas proposé." }))
      .refine(sansDoublon, { error: "Chaque régime ne peut être choisi qu'une fois." }),
  })
  .refine((membre) => membre.birthDate !== null || membre.ageGroup !== null, {
    error: "Indique la date de naissance ou choisis une tranche d'âge.",
    path: ["ageGroup"],
  });

export type Membre = z.infer<typeof membreSchema>;

/** Le membre déclare-t-il une donnée de santé (allergie ou régime) ? Il faut alors le consentement. */
export function aDesRestrictions(membre: Membre): boolean {
  return membre.allergies.length + membre.autresAllergies.length + membre.regimes.length > 0;
}
