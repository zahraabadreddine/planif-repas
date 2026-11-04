import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import type { ArticleAchat } from "@/lib/validation/stock";
import type { StorageLocation } from "@prisma/client";

// Déclaration des achats (EF-13). Le foyer vient de la session (règle 4).
// Chaque achat crée un StockMovement de type `purchase` (règle 5).

type ConservationJours = {
  ambiant?: number;
  frigo?: number;
  congelateur?: number;
};

const CLE_CONSERVATION: Record<StorageLocation, keyof ConservationJours> = {
  pantry: "ambiant",
  fridge: "frigo",
  freezer: "congelateur",
};

function calculerExpiration(
  shelfLifeDays: ConservationJours,
  location: StorageLocation,
  dateAchat: Date,
): Date | null {
  const cle = CLE_CONSERVATION[location];
  const jours = shelfLifeDays[cle];
  if (jours === undefined || jours === null) return null;
  const expiration = new Date(dateAchat);
  expiration.setDate(expiration.getDate() + jours);
  return expiration;
}

export type ArticleCree = {
  stockItemId: string;
  ingredientName: string;
  unitLabel: string;
  quantity: number;
  location: StorageLocation;
  expiresAt: Date | null;
};

/**
 * Déclare une liste d'achats pour le foyer de la session.
 * Pour chaque article : cherche un StockItem existant (même ingrédient, même unité, même lieu)
 * ou en crée un nouveau ; crée un mouvement `purchase` ; met à jour la quantité.
 */
export async function declarerAchats(
  session: SessionVerifiee,
  items: ArticleAchat[],
): Promise<ArticleCree[]> {
  const householdId = session.householdId;
  if (!householdId) throw new ErreurApi("FOYERMANQUANT");

  const ingredientIds = [...new Set(items.map((a) => a.ingredientId))];
  const unitIds = [...new Set(items.map((a) => a.unitId))];

  const [ingredients, units] = await Promise.all([
    prisma.ingredient.findMany({
      where: { id: { in: ingredientIds } },
      select: { id: true, name: true, shelfLifeDays: true },
    }),
    prisma.marketUnit.findMany({
      where: { id: { in: unitIds } },
      select: { id: true, label: true, gramsEquivalent: true },
    }),
  ]);

  const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));
  const unitMap = new Map(units.map((u) => [u.id, u]));

  for (const article of items) {
    if (!ingredientMap.has(article.ingredientId)) {
      throw new ErreurApi("INTROUVABLE", "Un ingrédient n'existe pas dans le catalogue.");
    }
    if (!unitMap.has(article.unitId)) {
      throw new ErreurApi("INTROUVABLE", "Une unité n'existe pas dans le catalogue.");
    }
  }

  const maintenant = new Date();
  const resultats: ArticleCree[] = [];

  for (const article of items) {
    const ingredient = ingredientMap.get(article.ingredientId)!;
    const unit = unitMap.get(article.unitId)!;
    const conservation = ingredient.shelfLifeDays as ConservationJours;
    const expiresAt = calculerExpiration(conservation, article.location, maintenant);
    const grams = article.quantity * unit.gramsEquivalent;

    const existant = await prisma.stockItem.findFirst({
      where: {
        householdId,
        ingredientId: article.ingredientId,
        unitId: article.unitId,
        location: article.location,
        status: { in: ["ok", "useSoon"] },
      },
    });

    if (existant) {
      const nouvelleQuantite = existant.quantity + article.quantity;
      const nouvelleExpiration = expiresAt
        ? existant.expiresAt && existant.expiresAt < expiresAt
          ? existant.expiresAt
          : expiresAt
        : existant.expiresAt;

      await prisma.$transaction([
        prisma.stockMovement.create({
          data: {
            stockItemId: existant.id,
            type: "purchase",
            quantity: article.quantity,
            grams,
          },
        }),
        prisma.stockItem.update({
          where: { id: existant.id },
          data: {
            quantity: nouvelleQuantite,
            expiresAt: nouvelleExpiration,
            status: nouvelleExpiration && joursAvant(nouvelleExpiration) <= 2 ? "useSoon" : "ok",
          },
        }),
      ]);

      resultats.push({
        stockItemId: existant.id,
        ingredientName: ingredient.name,
        unitLabel: unit.label,
        quantity: nouvelleQuantite,
        location: article.location,
        expiresAt: nouvelleExpiration,
      });
    } else {
      const statut = expiresAt && joursAvant(expiresAt) <= 2 ? "useSoon" : "ok";

      const nouveau = await prisma.$transaction(async (tx) => {
        const item = await tx.stockItem.create({
          data: {
            householdId,
            ingredientId: article.ingredientId,
            unitId: article.unitId,
            quantity: article.quantity,
            location: article.location,
            expiresAt,
            status: statut,
          },
        });
        await tx.stockMovement.create({
          data: {
            stockItemId: item.id,
            type: "purchase",
            quantity: article.quantity,
            grams,
          },
        });
        return item;
      });

      resultats.push({
        stockItemId: nouveau.id,
        ingredientName: ingredient.name,
        unitLabel: unit.label,
        quantity: article.quantity,
        location: article.location,
        expiresAt,
      });
    }
  }

  return resultats;
}

function joursAvant(date: Date): number {
  const maintenant = new Date();
  const diff = date.getTime() - maintenant.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
