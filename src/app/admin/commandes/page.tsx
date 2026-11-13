import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/titre-page";
import { GestionCommandes } from "./gestion-commandes";

export default async function AdminCommandesPage() {
  const [commandes, chauffeurs] = await Promise.all([
    prisma.deliveryOrder.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        household: { select: { name: true } },
        deliveryPoint: { select: { name: true, address: true, commune: true, phone: true } },
        driver: { include: { user: { select: { fullName: true } } } },
        items: {
          include: {
            ingredient: { select: { name: true } },
            unit: { select: { label: true } },
          },
        },
      },
    }),
    prisma.driver.findMany({
      where: { status: { in: ["available", "busy"] } },
      include: { user: { select: { fullName: true } } },
    }),
  ]);

  const data = commandes.map((c) => ({
    id: c.id,
    status: c.status,
    totalFcfa: c.totalFcfa,
    deliveryFeeFcfa: c.deliveryFeeFcfa,
    createdAt: c.createdAt.toISOString(),
    household: c.household?.name ?? "—",
    point: {
      name: c.deliveryPoint?.name ?? "—",
      address: c.deliveryPoint?.address ?? "",
      commune: c.deliveryPoint?.commune ?? "",
      phone: c.deliveryPoint?.phone ?? null,
    },
    driver: c.driver
      ? { id: c.driver.id, name: c.driver.user.fullName }
      : null,
    items: c.items.map((it) => ({
      name: it.ingredient.name,
      quantity: it.quantity,
      unit: it.unit.label,
      priceFcfa: it.priceFcfa,
    })),
  }));

  const drivers = chauffeurs.map((d) => ({
    id: d.id,
    name: d.user.fullName,
    commune: d.commune,
    status: d.status,
  }));

  return (
    <>
      <PageHeader overline="Administration" title="Commandes Delivery" />
      <GestionCommandes commandes={data} chauffeurs={drivers} />
    </>
  );
}
