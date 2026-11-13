import type { Prisma } from "@prisma/client";

type ItemAvecDetails = {
  ingredientId: string;
  unitId: string;
  quantity: number;
  unit: { gramsEquivalent: number };
};

export async function crediterStockLivraison(
  tx: Prisma.TransactionClient,
  householdId: string,
  commandeId: string,
  items: ItemAvecDetails[],
): Promise<void> {
  for (const item of items) {
    const grams = item.unit.gramsEquivalent * item.quantity;

    const existant = await tx.stockItem.findFirst({
      where: {
        householdId,
        ingredientId: item.ingredientId,
        unitId: item.unitId,
        status: "ok",
      },
    });

    if (existant) {
      await tx.stockItem.update({
        where: { id: existant.id },
        data: { quantity: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          stockItemId: existant.id,
          type: "purchase",
          quantity: item.quantity,
          grams,
          reference: `delivery:${commandeId}`,
        },
      });
    } else {
      const nouveau = await tx.stockItem.create({
        data: {
          householdId,
          ingredientId: item.ingredientId,
          unitId: item.unitId,
          quantity: item.quantity,
          location: "pantry",
          status: "ok",
        },
      });
      await tx.stockMovement.create({
        data: {
          stockItemId: nouveau.id,
          type: "purchase",
          quantity: item.quantity,
          grams,
          reference: `delivery:${commandeId}`,
        },
      });
    }

    await tx.shoppingListItem.updateMany({
      where: {
        ingredientId: item.ingredientId,
        checked: false,
        list: { householdId },
      },
      data: { checked: true },
    });
  }
}
