import { z } from "zod";

// Validation des entrées du stock (EF-13, EF-14).

/** Au-delà, c'est forcément une faute de frappe (1000 tas, 1000 kg…). */
export const QUANTITEMAX = 1000;
const tropGrand = `${QUANTITEMAX} au maximum : vérifie la quantité.`;

const LOCATIONS = ["fridge", "freezer", "pantry"] as const;

const articleAchatSchema = z.strictObject({
  ingredientId: z.uuid({ error: "Choisis un ingrédient." }),
  unitId: z.uuid({ error: "Choisis une unité." }),
  quantity: z
    .number({ error: "Indique une quantité." })
    .positive("La quantité doit être positive.")
    .max(QUANTITEMAX, tropGrand),
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
    .min(0, "La quantité ne peut pas être négative.")
    .max(QUANTITEMAX, tropGrand),
});

export type CorrectionDemande = z.infer<typeof correctionSchema>;

export const jetSchema = z.strictObject({
  quantity: z
    .number({ error: "Indique la quantité jetée." })
    .positive("La quantité doit être positive.")
    .max(QUANTITEMAX, tropGrand),
});

export type JetDemande = z.infer<typeof jetSchema>;
