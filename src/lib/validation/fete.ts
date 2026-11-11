import { z } from "zod";
import { CATEGORIESPLAT } from "./plat-foyer";
import { PORTIONSMAX } from "./repas";

// Menu de fête : plusieurs plats au même repas, avec un budget propre (EF-07 étendu).

/** 30 plats au plus : au-delà, ce n'est plus un repas. */
export const PLATSFETEMAX = 30;

// strictObject : le foyer vient de la session, jamais du corps de la requête (règle 4)
export const feteSchema = z.strictObject({
  date: z.string().date("Date invalide."),
  creneau: z.enum(["lunch", "dinner"], { error: "Un repas de fête est un déjeuner ou un dîner." }),
  personnes: z
    .number({ error: "Le nombre de personnes est obligatoire." })
    .int()
    .min(1, { error: "Au moins une personne." })
    .max(PORTIONSMAX, { error: `${PORTIONSMAX} personnes maximum.` }),
  budgetFcfa: z
    .number({ error: "Le budget est obligatoire." })
    .int({ error: "Le budget est un nombre entier de FCFA." })
    .positive({ error: "Le budget doit être positif." })
    .max(10000000, { error: "Ce budget semble trop grand." }),
  plats: z
    .array(
      z.strictObject({
        recetteId: z.uuid({ error: "Plat inconnu." }),
        categorie: z.enum(CATEGORIESPLAT, {
          error: "Choisis entrée, plat, accompagnement ou dessert.",
        }),
      }),
    )
    .min(1, { error: "Il faut au moins un plat." })
    .max(PLATSFETEMAX, { error: `${PLATSFETEMAX} plats au plus.` })
    .refine((plats) => new Set(plats.map((p) => p.recetteId)).size === plats.length, {
      error: "Un même plat est présent deux fois.",
    }),
});

export type DemandeFete = z.infer<typeof feteSchema>;
