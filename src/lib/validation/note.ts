import { z } from "zod";

// Notes de plats du départ (EF-04). « Jamais goûté » n'est pas une note : rien n'est enregistré.

export type Note = 1 | 2 | 3;

/** Nombre de plats proposés par série : court, même quand le catalogue grandit. */
export const TAILLESERIE = 10;

export const NOTES: readonly { valeur: Note; libelle: string }[] = [
  { valeur: 3, libelle: "J'aime" },
  { valeur: 2, libelle: "Bof" },
  { valeur: 1, libelle: "Je n'aime pas" },
];

// strictObject : le foyer vient de la session, jamais de la requête.
export const noteSchema = z.strictObject({
  recipeId: z.uuid({ error: "Ce plat est introuvable." }),
  // null : retirer la note (le plat redevient « jamais goûté »)
  rating: z
    .union([z.literal(1), z.literal(2), z.literal(3)], { error: "Cette note n'est pas valable." })
    .nullable(),
});

export type NoteDemandee = z.infer<typeof noteSchema>;
