import { z } from "zod";

// Remplacement d'un repas du menu (EF-06).

// strictObject : le foyer vient de la session, jamais de la requête.
export const remplacementSchema = z.strictObject({
  recipeId: z.uuid({ error: "Choisis une recette." }),
});

export type RemplacementDemande = z.infer<typeof remplacementSchema>;
