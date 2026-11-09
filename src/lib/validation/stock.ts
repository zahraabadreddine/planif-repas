import { z } from "zod";

// Validation des entrées du stock (EF-13, EF-14).

const LOCATIONS = ["fridge", "freezer", "pantry"] as const;

const articleAchatSchema = z.strictObject({
  ingredientId: z.uuid({ error: "Choisis un ingrédient." }),
  unitId: z.uuid({ error: "Choisis une unité." }),
  quantity: z
    .number({ error: "Indique une quantité." })
    .positive("La quantité doit être positive."),
  location: z.enum(LOCATIONS, { error: "Choisis entre frigo, congélateur ou placard." }),
});

export const achatsSchema = z.strictObject({
  items: z
    .array(articleAchatSchema)
    .min(1, "Ajoute au moins un article.")
    .max(50, "50 articles maximum à la fois."),
});

export type ArticleAchat = z.infer<typeof articleAchatSchema>;
export type AchatsDemande = z.infer<typeof achatsSchema>;

export const correctionSchema = z.strictObject({
  quantity: z
    .number({ error: "Indique la nouvelle quantité." })
    .min(0, "La quantité ne peut pas être négative."),
});

export type CorrectionDemande = z.infer<typeof correctionSchema>;

export const jetSchema = z.strictObject({
  quantity: z
    .number({ error: "Indique la quantité jetée." })
    .positive("La quantité doit être positive."),
});

export type JetDemande = z.infer<typeof jetSchema>;
