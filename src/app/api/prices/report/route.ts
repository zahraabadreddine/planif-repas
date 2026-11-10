import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerSession } from "@/lib/auth/garde";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { dateDuJour } from "@/lib/foyer/age";
import { dateSansHeure } from "@/lib/validation/menu";
import { lireCorps } from "@/lib/validation/requete";

/** Un prix au-delà est forcément une erreur de saisie. */
const PRIXMAXFCFA = 1_000_000;

const reportSchema = z.strictObject({
  ingredientId: z.uuid({ error: "Ingrédient obligatoire." }),
  unitId: z.uuid({ error: "Unité obligatoire." }),
  priceFcfa: z
    .number({ error: "Le prix est obligatoire." })
    .int("Le prix doit être entier.")
    .positive("Le prix doit être positif.")
    .max(PRIXMAXFCFA, "Ce prix semble trop élevé."),
  placeType: z.enum(["market", "supermarket", "shop"], {
    error: "Type de lieu invalide.",
  }),
  storeId: z.uuid().nullable().optional(),
  city: z.string().trim().min(1).max(60).default("Abidjan"),
  // Une date future resterait « récente » et compterait toujours dans la médiane
  observedAt: z.iso
    .date({ error: "Date d'observation invalide." })
    .refine((texte) => texte <= dateDuJour(), { error: "La date ne peut pas être dans le futur." }),
});

/**
 * POST /api/prices/report : une famille déclare un prix observé (source « user »).
 * Un seul relevé par personne, article, lieu et jour : une même personne ne peut pas peser
 * plusieurs fois dans la médiane du prix retenu (§11).
 */
export async function POST(requete: Request) {
  try {
    const session = await exigerSession();
    const corps = await lireCorps(requete, reportSchema);
    const observedAt = dateSansHeure(corps.observedAt);

    const unite = await prisma.marketUnit.findUnique({
      where: { id: corps.unitId },
      select: { ingredientId: true },
    });
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: corps.ingredientId },
      select: { id: true },
    });
    // Unité générique (kg, pièce) ou propre à cet ingrédient
    if (!ingredient || !unite || (unite.ingredientId && unite.ingredientId !== ingredient.id)) {
      throw new ErreurApi("INTROUVABLE");
    }
    if (corps.storeId && !(await prisma.store.findUnique({ where: { id: corps.storeId } }))) {
      throw new ErreurApi("INTROUVABLE");
    }

    const dejaDeclare = await prisma.price.count({
      where: {
        reportedById: session.userId,
        ingredientId: corps.ingredientId,
        placeType: corps.placeType,
        city: corps.city,
        observedAt,
      },
    });
    if (dejaDeclare > 0) throw new ErreurApi("PRIXDEJADECLARE");

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
        observedAt,
      },
    });

    return NextResponse.json({ price: { id: prix.id } }, { status: 201 });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
