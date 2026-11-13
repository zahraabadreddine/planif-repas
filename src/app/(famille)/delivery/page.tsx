import { redirect } from "next/navigation";
import { sessionDeLaPage } from "../foyer/commun";
import { DeliveryClient } from "./delivery-client";
import { prisma } from "@/lib/db";

export default async function DeliveryPage() {
  const session = await sessionDeLaPage();
  if (!session.householdId) redirect("/foyer");

  const points = await prisma.deliveryPoint.findMany({
    where: { status: "active" },
    include: {
      stock: {
        where: { quantity: { gt: 0 } },
        include: {
          ingredient: { select: { id: true, name: true } },
          unit: { select: { id: true, label: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const besoins = await prisma.shoppingListItem.findMany({
    where: {
      list: {
        mealPlan: {
          householdId: session.householdId,
          status: "active",
        },
      },
      checked: false,
    },
    select: { ingredientId: true },
  });

  const ingredientsBesoin = new Set(besoins.map((b) => b.ingredientId));

  const pointsAvecCorrespondance = points.map((p) => {
    const produitsDisponibles = p.stock.map((s) => ({
      ingredientId: s.ingredientId,
      ingredientName: s.ingredient.name,
      unitId: s.unit.id,
      quantity: s.quantity,
      unitLabel: s.unit.label,
      priceFcfa: s.priceFcfa,
      correspondBesoin: ingredientsBesoin.has(s.ingredientId),
    }));

    return {
      id: p.id,
      name: p.name,
      address: p.address,
      lat: p.latitude,
      lng: p.longitude,
      phone: p.phone,
      deliveryFeeFcfa: p.deliveryFeeFcfa,
      produits: produitsDisponibles,
      nbCorrespondances: produitsDisponibles.filter((pr) => pr.correspondBesoin).length,
    };
  });

  return <DeliveryClient points={pointsAvecCorrespondance} householdId={session.householdId} />;
}
