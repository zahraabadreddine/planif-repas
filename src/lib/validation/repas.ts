import { z } from "zod";

// Remplacement d'un repas du menu (EF-06).

// strictObject : le foyer vient de la session, jamais de la requête.
export const remplacementSchema = z.strictObject({
  recipeId: z.uuid({ error: "Choisis une recette." }),
});

export type RemplacementDemande = z.infer<typeof remplacementSchema>;

// Modification d'un repas : déplacer, remplacer, changer les portions (EF-07).
const creneaux = ["breakfast", "lunch", "dinner"] as const;

export const modificationRepasSchema = z
  .strictObject({
    recipeId: z.uuid({ error: "Choisis une recette." }).optional(),
    date: z.string().date("Date invalide.").optional(),
    slot: z.enum(creneaux, { error: "Créneau invalide (breakfast, lunch, dinner)." }).optional(),
    servings: z
      .number({ error: "Le nombre de portions est obligatoire." })
      .int("Le nombre de portions doit être entier.")
      .min(1, "Au moins une portion.")
      .max(20, "Vingt portions maximum.")
      .optional(),
  })
  .refine((d) => d.recipeId || d.date || d.slot || d.servings !== undefined, {
    message: "Indique au moins un champ à modifier.",
  });

export type ModificationRepasDemande = z.infer<typeof modificationRepasSchema>;
