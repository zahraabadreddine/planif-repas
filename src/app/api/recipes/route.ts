import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { listerCatalogue } from "@/lib/catalogue/recettes";
import { gererErreur } from "@/lib/erreurs";
import { lireFiltres } from "@/lib/validation/catalogue";

/**
 * GET /api/recipes : catalogue des recettes validées, filtré (EF-20).
 * Paramètres : q, cuisine, temps (20, 45, 90), cout (coût total maximum : 2000, 4000, 6000), tout=1.
 * Les recettes qui ne conviennent pas au foyer de la session sont masquées sauf avec tout=1.
 */
export async function GET(requete: Request) {
  try {
    const session = await exigerSession();
    const filtres = lireFiltres(Object.fromEntries(new URL(requete.url).searchParams));
    const { recettes, masquees } = await listerCatalogue(session, filtres);
    return NextResponse.json({ recipes: recettes, hidden: masquees });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
