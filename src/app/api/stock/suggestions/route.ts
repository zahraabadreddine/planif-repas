import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { viderLeFrigo } from "@/lib/stock/vider-frigo";

// GET /api/stock/suggestions : recettes faisables avec le stock (EF-16), pour tout le foyer
// ou, à défaut, pour moins de personnes.
export async function GET() {
  try {
    const session = await exigerSession();
    return NextResponse.json(await viderLeFrigo(session));
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
