import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { listerAlertes } from "@/lib/stock/peremption";

// GET /api/stock/alertes : renvoie les alertes de péremption, sans rien modifier (EF-15, lecture seule).
export async function GET() {
  try {
    const session = await exigerSession();
    return NextResponse.json(await listerAlertes(session));
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
