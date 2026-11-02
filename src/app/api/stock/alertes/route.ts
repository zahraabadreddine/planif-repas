import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { rafraichirPeremption } from "@/lib/stock/peremption";

// GET /api/stock/alertes : rafraîchit les statuts et renvoie les alertes de péremption (EF-15).
export async function GET() {
  try {
    const session = await exigerSession();
    const { alertes } = await rafraichirPeremption(session);
    return NextResponse.json(alertes);
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
