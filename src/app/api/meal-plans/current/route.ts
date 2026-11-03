import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { lireMenuCourant } from "@/lib/planificateur/generation";

/** GET /api/meal-plans/current : menu actif du foyer, sinon le dernier brouillon (EF-06). */
export async function GET() {
  try {
    const session = await exigerSession();
    return NextResponse.json({ plan: await lireMenuCourant(session) });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
