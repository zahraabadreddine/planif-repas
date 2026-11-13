import { redirect } from "next/navigation";
import { sessionDeLaPage } from "../foyer/commun";
import { DashboardClient } from "./dashboard-client";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const session = await sessionDeLaPage();
  if (!session.householdId) redirect("/foyer");

  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const debutMoisPrec = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1);

  const achats = await prisma.stockMovement.findMany({
    where: {
      stockItem: { householdId: session.householdId },
      type: "purchase",
      createdAt: { gte: debutMoisPrec },
    },
    select: {
      createdAt: true,
      quantity: true,
      stockItem: {
        select: {
          ingredient: { select: { name: true, category: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const commandesDelivery = await prisma.deliveryOrder.findMany({
    where: {
      householdId: session.householdId,
      createdAt: { gte: debutMoisPrec },
    },
    select: {
      createdAt: true,
      totalFcfa: true,
      deliveryFeeFcfa: true,
      type: true,
      status: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const menus = await prisma.mealPlan.findMany({
    where: {
      householdId: session.householdId,
      createdAt: { gte: debutMoisPrec },
    },
    select: {
      estimatedCostFcfa: true,
      createdAt: true,
      status: true,
    },
  });

  const donnees = {
    achats: achats.map((a) => ({
      date: a.createdAt.toISOString(),
      ingredient: a.stockItem.ingredient.name,
      categorie: a.stockItem.ingredient.category,
    })),
    commandes: commandesDelivery.map((c) => ({
      date: c.createdAt.toISOString(),
      total: c.totalFcfa,
      livraison: c.deliveryFeeFcfa,
      type: c.type,
      statut: c.status,
    })),
    budgets: menus.map((m) => ({
      date: m.createdAt.toISOString(),
      budget: m.estimatedCostFcfa,
      statut: m.status,
    })),
    debutMois: debutMois.toISOString(),
  };

  return <DashboardClient donnees={donnees} />;
}
