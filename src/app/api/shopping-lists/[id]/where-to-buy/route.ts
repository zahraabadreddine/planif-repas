import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerSession } from "@/lib/auth/garde";
import { ouAcheter } from "@/lib/magasins/recommandation";
import { ErreurApi, gererErreur } from "@/lib/erreurs";

type Contexte = { params: Promise<{ id: string }> };

/** GET /api/shopping-lists/:id/where-to-buy : découpage par lieu et magasins conseillés (EF-12). */
export async function GET(requete: Request, { params }: Contexte) {
  try {
    const session = await exigerSession();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const url = new URL(requete.url);
    const latStr = url.searchParams.get("lat");
    const lngStr = url.searchParams.get("lng");
    const lat = latStr ? Number(latStr) : undefined;
    const lng = lngStr ? Number(lngStr) : undefined;
    if ((lat !== undefined && isNaN(lat)) || (lng !== undefined && isNaN(lng))) {
      throw new ErreurApi("DONNEESINVALIDES", "Les coordonnées doivent être des nombres.");
    }

    const resultat = await ouAcheter(session, id, lat, lng);
    return NextResponse.json(resultat);
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
