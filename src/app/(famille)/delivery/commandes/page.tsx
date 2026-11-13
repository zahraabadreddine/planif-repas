import { redirect } from "next/navigation";
import { sessionDeLaPage } from "../../foyer/commun";
import { SuiviClient } from "./suivi-client";
import { prisma } from "@/lib/db";

export default async function CommandesPage() {
  const session = await sessionDeLaPage();
  if (!session.householdId) redirect("/foyer");

  const commandes = await prisma.deliveryOrder.findMany({
    where: { householdId: session.householdId },
    include: {
      deliveryPoint: { select: { name: true, address: true, phone: true } },
      items: {
        include: {
          ingredient: { select: { name: true } },
          unit: { select: { label: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const liste = commandes.map((c) => ({
    id: c.id,
    status: c.status,
    type: c.type,
    totalFcfa: c.totalFcfa,
    deliveryFeeFcfa: c.deliveryFeeFcfa,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    point: { name: c.deliveryPoint.name, address: c.deliveryPoint.address, phone: c.deliveryPoint.phone },
    items: c.items.map((i) => ({
      name: i.ingredient.name,
      quantity: i.quantity,
      unit: i.unit.label,
      priceFcfa: i.priceFcfa,
    })),
  }));

  return <SuiviClient commandes={liste} />;
}
