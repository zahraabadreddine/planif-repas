import { z } from "zod";
import { PORTIONSMAX } from "./repas";

// Un plat imaginé par Umi que la famille garde, avec les quantités qu'elle a validées.

export const CATEGORIESPLAT = ["entrée", "plat", "accompagnement", "dessert"] as const;
export type CategoriePlat = (typeof CATEGORIESPLAT)[number];

/** 50 kg d'un même ingrédient au plus : au-delà, c'est une faute de frappe. */
export const GRAMMESMAX = 50000;

// strictObject : le foyer vient de la session, jamais du corps de la requête (règle 4)
export const platFoyerSchema = z.strictObject({
  titre: z
    .string({ error: "Le nom du plat est obligatoire." })
    .trim()
    .min(3, { error: "Le nom du plat est trop court." })
    .max(80, { error: "Le nom du plat est trop long (80 caractères maximum)." }),
  categorie: z.enum(CATEGORIESPLAT).optional(),
  personnes: z
    .number({ error: "Le nombre de personnes est obligatoire." })
    .int()
    .min(1, { error: "Au moins une personne." })
    .max(PORTIONSMAX, { error: `${PORTIONSMAX} personnes maximum.` }),
  etapes: z.array(z.string().trim().min(3).max(200)).max(8).default([]),
  ingredients: z
    .array(
      z.strictObject({
        ingredientId: z.uuid({ error: "Ingrédient inconnu." }),
        grammes: z
          .number({ error: "Indique une quantité." })
          .positive({ error: "La quantité doit être positive." })
          .max(GRAMMESMAX, { error: "Cette quantité est trop grande." }),
      }),
    )
    .min(1, { error: "Il faut au moins un ingrédient." })
    .max(15, { error: "15 ingrédients au plus." }),
});

export type PlatFoyerDemande = z.infer<typeof platFoyerSchema>;
