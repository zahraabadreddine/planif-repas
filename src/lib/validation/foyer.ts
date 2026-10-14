import { z } from "zod";

// Schéma du profil du foyer (EF-03), partagé par le formulaire et la route /api/household.

/** Cuisines proposées au parent : celles du catalogue de recettes. */
export const CUISINES = [
  { valeur: "ivoirienne", libelle: "Ivoirienne" },
  { valeur: "libanaise", libelle: "Libanaise" },
  { valeur: "française", libelle: "Française" },
  { valeur: "marocaine", libelle: "Marocaine" },
  { valeur: "tunisienne", libelle: "Tunisienne" },
  { valeur: "italienne", libelle: "Italienne" },
  { valeur: "chinoise", libelle: "Chinoise" },
  { valeur: "indienne", libelle: "Indienne" },
] as const;

export type Cuisine = (typeof CUISINES)[number]["valeur"];

const valeursCuisines = CUISINES.map((cuisine) => cuisine.valeur) as [Cuisine, ...Cuisine[]];

/**
 * Jour des courses, enregistré selon la norme ISO 8601 : 1 = lundi … 7 = dimanche.
 * Attention : Date.getDay() de JavaScript compte 0 = dimanche … 6 = samedi.
 * null = pas de jour fixe.
 */
export const JOURS = [
  { valeur: 1, libelle: "Lundi", court: "Lun" },
  { valeur: 2, libelle: "Mardi", court: "Mar" },
  { valeur: 3, libelle: "Mercredi", court: "Mer" },
  { valeur: 4, libelle: "Jeudi", court: "Jeu" },
  { valeur: 5, libelle: "Vendredi", court: "Ven" },
  { valeur: 6, libelle: "Samedi", court: "Sam" },
  { valeur: 7, libelle: "Dimanche", court: "Dim" },
] as const;

/** Bornes du budget : le parent choisit librement, on bloque seulement les fautes de frappe. */
export const BUDGETMIN = 5000;
export const BUDGETMAX = 500000;

const fauteDeFrappe = "Vérifie le montant : il semble y avoir une faute de frappe.";

/** Nom proposé par défaut dans le formulaire. */
export const NOMPARDEFAUT = "Mon foyer";

// strictObject : un champ en trop (par exemple householdId) est refusé, le foyer vient de la session.
export const foyerSchema = z.strictObject({
  name: z
    .string({ error: "Le nom du foyer est obligatoire." })
    .trim()
    .min(2, { error: "Le nom du foyer est trop court." })
    .max(50, { error: "Le nom du foyer est trop long (50 caractères maximum)." }),
  weeklyBudgetFcfa: z
    .number({ error: "Indique ton budget de la semaine en FCFA." })
    .int({ error: "Le budget s'écrit sans virgule, en FCFA." })
    .min(BUDGETMIN, { error: fauteDeFrappe })
    .max(BUDGETMAX, { error: fauteDeFrappe }),
  cuisinesPreferred: z
    .array(z.enum(valeursCuisines, { error: "Cette cuisine n'est pas proposée." }))
    .refine((liste) => new Set(liste).size === liste.length, {
      error: "Chaque cuisine ne peut être choisie qu'une fois.",
    }),
  shoppingDay: z
    .number({ error: "Choisis un jour de la semaine." })
    .int({ error: "Choisis un jour de la semaine." })
    .min(1, { error: "Choisis un jour de la semaine." })
    .max(7, { error: "Choisis un jour de la semaine." })
    .nullable(),
});

export type Foyer = z.infer<typeof foyerSchema>;

/**
 * Lit le budget tapé par le parent : « 25 000 », « 25.000 », « 25,000 » ou « 25000 F » donnent 25000.
 * Un champ vide ou illisible donne NaN, que le schéma refuse avec un message clair.
 */
export function lireMontantFcfa(valeur: unknown): number {
  const texte = String(valeur ?? "")
    .replace(/\s/g, "")
    .replace(/f(cfa)?$/i, "");
  if (texte === "") return Number.NaN;
  const separateursDeMilliers = /^\d{1,3}([.,]\d{3})+$/.test(texte);
  return Number(separateursDeMilliers ? texte.replace(/[.,]/g, "") : texte);
}

/** Valeurs du formulaire tirées d'un foyer enregistré : uniquement les champs du schéma, sans l'identifiant. */
export function valeursDuFoyer(foyer: Foyer): Foyer {
  const { name, weeklyBudgetFcfa, cuisinesPreferred, shoppingDay } = foyer;
  return { name, weeklyBudgetFcfa, cuisinesPreferred, shoppingDay };
}
