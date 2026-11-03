import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { lireStock } from "@/lib/stock/lecture";
import { rafraichirPeremption } from "@/lib/stock/peremption";

// GET /api/stock : rafraîchit les statuts de péremption puis liste le stock (EF-15).
export async function GET() {
  try {
    const session = await exigerSession();
    await rafraichirPeremption(session);
    const articles = await lireStock(session);
    return NextResponse.json(articles);
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
