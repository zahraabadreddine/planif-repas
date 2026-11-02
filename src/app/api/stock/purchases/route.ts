import { NextResponse } from "next/server";
import { exigerEcriture } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { declarerAchats } from "@/lib/stock/achats";
import { achatsSchema } from "@/lib/validation/stock";
import { lireCorps } from "@/lib/validation/requete";

// POST /api/stock/purchases : déclare des achats et crée le stock (EF-13).
export async function POST(requete: Request) {
  try {
    const session = await exigerEcriture();
    const { items } = await lireCorps(requete, achatsSchema);
    const resultats = await declarerAchats(session, items);
    return NextResponse.json(resultats, { status: 201 });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
