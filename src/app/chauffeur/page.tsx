import { prisma } from "@/lib/db";
import { exigerChauffeur } from "@/lib/auth/garde";
import { PageHeader } from "@/components/titre-page";
import { TableauChauffeur } from "./tableau-chauffeur";

export default async function ChauffeurPage() {
  const session = await exigerChauffeur();

  const driver = await prisma.driver.findUnique({
    where: { userId: session.userId },
    include: { user: { select: { fullName: true } } },
  });
  if (!driver) throw new Error("Profil chauffeur introuvable");

  const prenom = driver.user.fullName.split(" ")[0];

  const commandes = await prisma.deliveryOrder.findMany({
    where: { driverId: driver.id },
    orderBy: { createdAt: "desc" },
    include: {
      household: { select: { name: true } },
      deliveryPoint: { select: { name: true, address: true, commune: true, phone: true } },
      items: {
        include: {
          ingredient: { select: { name: true } },
          unit: { select: { label: true } },
        },
      },
    },
  });

  const data = commandes.map((c) => ({
    id: c.id,
    status: c.status,
    totalFcfa: c.totalFcfa,
    createdAt: c.createdAt.toISOString(),
    household: c.household?.name ?? "—",
    point: {
      name: c.deliveryPoint?.name ?? "—",
      address: c.deliveryPoint?.address ?? "",
      commune: c.deliveryPoint?.commune ?? "",
      phone: c.deliveryPoint?.phone ?? null,
    },
    items: c.items.map((it) => ({
      name: it.ingredient.name,
      quantity: it.quantity,
      unit: it.unit.label,
      priceFcfa: it.priceFcfa,
    })),
  }));

  return (
    <>
      <PageHeader overline="Espace chauffeur" title={`Bonjour ${prenom}`} overlineClassName="text-sirop" />
      <TableauChauffeur commandes={data} driverStatus={driver.status} />
    </>
  );
}
