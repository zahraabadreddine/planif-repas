import { z } from "zod";

// Génération du menu de la semaine (EF-06).

/** Date « AAAA-MM-JJ » à minuit UTC : les dates de repas sont des dates sans heure. */
export function dateSansHeure(texte: string): Date {
  return new Date(`${texte}T00:00:00.000Z`);
}

// strictObject : le foyer vient de la session, jamais de la requête.
export const generationSchema = z.strictObject({
  weekStart: z
    .iso.date({ error: "Choisis le lundi de la semaine." })
    .refine((texte) => dateSansHeure(texte).getUTCDay() === 1, {
      error: "La semaine commence un lundi.",
    }),
});

export type GenerationDemandee = z.infer<typeof generationSchema>;
