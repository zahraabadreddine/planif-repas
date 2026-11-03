import { NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { quitterFoyer } from "@/lib/foyer/invitations";

/** POST /api/household/leave : une personne invitée quitte le foyer (EF-03). */
export async function POST() {
  try {
    await quitterFoyer(await exigerSession());
    return NextResponse.json({ ok: true });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
