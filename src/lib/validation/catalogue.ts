import { z } from "zod";
import { CUISINES, type Cuisine } from "@/lib/validation/foyer";

// Filtres du catalogue (EF-20), lus dans l'adresse de la page ou de la route GET /api/recipes.

/** Choix proposés : temps total en minutes, coût total de la recette en FCFA. */
export const TEMPS = [20, 45, 90] as const;
export const COUTS = [2000, 4000, 6000] as const;

const valeursCuisines = CUISINES.map((c) => c.valeur) as [Cuisine, ...Cuisine[]];

const choix = <T extends readonly number[]>(valeurs: T) =>
  z.coerce
    .number()
    .refine((n): n is T[number] => (valeurs as readonly number[]).includes(n))
    .optional();

// Un filtre inconnu ou mal écrit est simplement ignoré : la page ne casse jamais.
export const filtresSchema = z.object({
  q: z.string().trim().max(60).optional().catch(undefined),
  cuisine: z.enum(valeursCuisines).optional().catch(undefined),
  temps: choix(TEMPS).catch(undefined),
  cout: choix(COUTS).catch(undefined),
  tout: z.literal("1").optional().catch(undefined),
});

export type Filtres = z.infer<typeof filtresSchema>;

/** Lit les filtres depuis les paramètres de l'adresse (valeurs multiples : la première compte). */
export function lireFiltres(parametres: Record<string, string | string[] | undefined>): Filtres {
  const premiers = Object.fromEntries(
    Object.entries(parametres).map(([cle, valeur]) => [
      cle,
      Array.isArray(valeur) ? valeur[0] : valeur,
    ]),
  );
  return filtresSchema.parse(premiers);
}
