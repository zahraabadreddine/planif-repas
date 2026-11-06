import { NextRequest, NextResponse } from "next/server";
import { exigerEcriture } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { accepterProposition } from "@/lib/agent/proposals";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await exigerEcriture();
    const { id } = await params;

    const resultat = await accepterProposition(session, id);

    return NextResponse.json(resultat);
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
