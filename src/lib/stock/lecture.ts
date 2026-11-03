import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";

// Lecture du stock du foyer (EF-15). Les articles bientôt périmés apparaissent en premier.

export type ArticleStock = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  category: string;
  unitId: string;
  unitLabel: string;
  quantity: number;
  location: string;
  expiresAt: string | null;
  status: string;
  addedAt: string;
};

export async function lireStock(session: SessionVerifiee): Promise<ArticleStock[]> {
  const householdId = session.householdId;
  if (!householdId) throw new ErreurApi("FOYERMANQUANT");

  const articles = await prisma.stockItem.findMany({
    where: {
      householdId,
      status: { in: ["ok", "useSoon"] },
      quantity: { gt: 0 },
    },
    include: {
      ingredient: { select: { name: true, category: true } },
      unit: { select: { label: true } },
    },
    orderBy: [{ expiresAt: "asc" }, { ingredient: { name: "asc" } }],
  });

  return articles.map((a) => ({
    id: a.id,
    ingredientId: a.ingredientId,
    ingredientName: a.ingredient.name,
    category: a.ingredient.category,
    unitId: a.unitId,
    unitLabel: a.unit.label,
    quantity: a.quantity,
    location: a.location,
    expiresAt: a.expiresAt?.toISOString() ?? null,
    status: a.status,
    addedAt: a.addedAt.toISOString(),
  }));
}
