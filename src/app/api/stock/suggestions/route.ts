import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { suggererRecettes } from "@/lib/stock/vider-frigo";

// GET /api/stock/suggestions : recettes faisables avec le stock (EF-16).
export async function GET() {
  try {
    const session = await exigerSession();
    const suggestions = await suggererRecettes(session);
    return NextResponse.json(suggestions);
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
