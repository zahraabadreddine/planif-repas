import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { enregistrerConsentementSante } from "@/lib/foyer/consentement";
import { lireCorps } from "@/lib/validation/requete";

const consentementSchema = z.strictObject({ health: z.literal(true) });

/** PUT /api/account/consent : consentement aux données de santé donné après l'inscription (§13). */
export async function PUT(requete: Request) {
  try {
    const session = await exigerSession();
    await lireCorps(requete, consentementSchema);
    await enregistrerConsentementSante(session);
    return NextResponse.json({ consentHealth: true });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
