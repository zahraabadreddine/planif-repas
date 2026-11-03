import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { lireStock } from "@/lib/stock/lecture";

// GET /api/stock : liste le stock du foyer (EF-15, lecture seule).
export async function GET() {
  try {
    const session = await exigerSession();
    const articles = await lireStock(session);
    return NextResponse.json(articles);
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
