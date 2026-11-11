import type { StorageLocation } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { declarerAchats } from "@/lib/stock/achats";

// Un article coché sur la liste de courses arrive dans le stock ; décoché, il en repart.
// Tout passe par des mouvements (règle 5) reliés à l'article par leur référence.

export type Conservation = { ambiant?: number; frigo?: number; congelateur?: number };

/** Référence commune aux mouvements créés depuis un article de la liste. */
export function referenceArticle(itemId: string): string {
  return `liste:${itemId}`;
}

/**
 * Où ranger un article acheté : là où il se garde le plus longtemps sans le congeler.
 * Tomates (3 jours dehors, 7 au frigo) : frigo. Riz (rien au frigo) : placard.
 */
export function lieuDeRangement(conservation: Conservation): StorageLocation {
  const { ambiant, frigo, congelateur } = conservation;
  if (ambiant === undefined && frigo === undefined) {
    return congelateur === undefined ? "pantry" : "freezer";
  }
  if (frigo === undefined) return "pantry";
  if (ambiant === undefined) return "fridge";
  return frigo > ambiant ? "fridge" : "pantry";
}

export type ArticleAAjouter = {
  id: string;
  ingredientId: string;
  unitId: string;
  quantity: number;
  conservation: Conservation;
};

/** L'article coché devient un achat : mouvement `purchase` relié à l'article. */
export async function ajouterDepuisListe(
  session: SessionVerifiee,
  article: ArticleAAjouter,
): Promise<void> {
  await declarerAchats(
    session,
    [
      {
        ingredientId: article.ingredientId,
        unitId: article.unitId,
        quantity: article.quantity,
        location: lieuDeRangement(article.conservation),
      },
    ],
    referenceArticle(article.id),
  );
}

/** Ce qu'il reste à retirer pour annuler les mouvements d'un article, sans passer sous zéro. */
export function quantiteARetirer(netAjoute: number, enStock: number): number {
  return Math.round(Math.max(0, Math.min(netAjoute, enStock)) * 1000) / 1000;
}

/**
 * L'article décoché : une correction retire ce que la coche avait ajouté (jamais compté
 * comme gaspillé). Si une partie a déjà été cuisinée, on ne retire que ce qui reste.
 */
export async function retirerDepuisListe(session: SessionVerifiee, itemId: string): Promise<void> {
  const householdId = session.householdId;
  if (!householdId) throw new ErreurApi("FOYERMANQUANT");
  const reference = referenceArticle(itemId);

  await prisma.$transaction(async (tx) => {
    const mouvements = await tx.stockMovement.findMany({
      where: { reference, stockItem: { householdId } },
      include: { stockItem: { include: { unit: { select: { gramsEquivalent: true } } } } },
    });

    const parArticle = new Map<
      string,
      { net: number; item: (typeof mouvements)[number]["stockItem"] }
    >();
    for (const m of mouvements) {
      const courant = parArticle.get(m.stockItemId) ?? { net: 0, item: m.stockItem };
      courant.net += m.quantity;
      parArticle.set(m.stockItemId, courant);
    }

    for (const { net, item } of parArticle.values()) {
      const retrait = quantiteARetirer(net, item.quantity);
      if (retrait === 0) continue;
      const restant = Math.round((item.quantity - retrait) * 1000) / 1000;
      await tx.stockMovement.create({
        data: {
          stockItemId: item.id,
          type: "correction",
          quantity: -retrait,
          grams: -retrait * item.unit.gramsEquivalent,
          reference,
        },
      });
      await tx.stockItem.update({
        where: { id: item.id },
        data: { quantity: restant, status: restant <= 0 ? "used" : item.status },
      });
    }
  });
}
