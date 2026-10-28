import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerSession } from "@/lib/auth/garde";
import { prisma } from "@/lib/db";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { magasinsProches, type MagasinAvecDistance } from "@/lib/magasins/distance";

const schemaQuery = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  type: z.enum(["market", "supermarket", "shop"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

/** GET /api/stores : magasins triés par distance (EF-12). */
export async function GET(requete: Request) {
  try {
    const session = await exigerSession();
    if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

    const url = new URL(requete.url);
    const parsed = schemaQuery.safeParse({
      lat: url.searchParams.get("lat") ?? undefined,
      lng: url.searchParams.get("lng") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });
    if (!parsed.success) throw new ErreurApi("DONNEESINVALIDES", "Paramètres invalides.");
    const { lat, lng, type, limit } = parsed.data;

    const foyer = await prisma.household.findUnique({
      where: { id: session.householdId },
      include: { neighborhood: true },
    });

    let latRef: number;
    let lngRef: number;
    if (lat !== undefined && lng !== undefined) {
      latRef = lat;
      lngRef = lng;
    } else if (foyer?.neighborhood) {
      latRef = foyer.neighborhood.latitude;
      lngRef = foyer.neighborhood.longitude;
    } else {
      throw new ErreurApi("DONNEESINVALIDES", "Position nécessaire : envoie lat et lng, ou configure ton quartier.");
    }

    const where: { type?: "market" | "supermarket" | "shop"; neighborhood?: { commune: string } } = {};
    if (type) where.type = type;
    if (foyer?.neighborhood) where.neighborhood = { commune: foyer.neighborhood.commune };

    const magasins = await prisma.store.findMany({ where });
    const maintenant = new Date();
    const tries: MagasinAvecDistance[] = magasinsProches(magasins, latRef, lngRef, limit, maintenant);

    return NextResponse.json({ stores: tries });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
