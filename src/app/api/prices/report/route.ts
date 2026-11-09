import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";
import { lireCorps } from "@/lib/validation/requete";

const reportSchema = z.strictObject({
  ingredientId: z.uuid({ error: "Ingrédient obligatoire." }),
  unitId: z.uuid({ error: "Unité obligatoire." }),
  priceFcfa: z
    .number({ error: "Le prix est obligatoire." })
    .int("Le prix doit être entier.")
    .positive("Le prix doit être positif."),
  placeType: z.enum(["market", "supermarket", "shop"], {
    error: "Type de lieu invalide.",
  }),
  storeId: z.uuid().nullable().optional(),
  city: z.string().trim().min(1).max(60).default("Abidjan"),
  observedAt: z.coerce.date({ error: "Date d'observation invalide." }),
});

export async function POST(requete: Request) {
  try {
    const session = await exigerSession();
    const corps = await lireCorps(requete, reportSchema);

    const prix = await prisma.price.create({
      data: {
        ingredientId: corps.ingredientId,
        unitId: corps.unitId,
        priceFcfa: corps.priceFcfa,
        placeType: corps.placeType,
        storeId: corps.storeId ?? null,
        city: corps.city,
        source: "user",
        reportedById: session.userId,
        observedAt: corps.observedAt,
      },
    });

    return NextResponse.json({ price: { id: prix.id } }, { status: 201 });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
