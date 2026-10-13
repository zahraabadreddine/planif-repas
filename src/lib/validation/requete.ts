import type { z } from "zod";
import { ErreurApi } from "@/lib/erreurs";
import { erreursParChamp } from "./compte";

/**
 * Lit le corps JSON d'une requête et le valide avec un schéma zod.
 * Lève DONNEESINVALIDES (400) si le JSON est illisible ou ne respecte pas le schéma.
 */
export async function lireCorps<Schema extends z.ZodType>(
  requete: Request,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let corps: unknown;
  try {
    corps = await requete.json();
  } catch {
    throw new ErreurApi("DONNEESINVALIDES");
  }
  const resultat = schema.safeParse(corps);
  if (!resultat.success) {
    throw new ErreurApi("DONNEESINVALIDES", undefined, erreursParChamp(resultat.error));
  }
  return resultat.data;
}
