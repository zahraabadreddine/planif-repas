import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/titre-page";
import { GestionChauffeurs } from "./gestion-chauffeurs";

export default async function AdminChauffeursPage() {
  const chauffeurs = await prisma.driver.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { fullName: true, email: true } },
      _count: { select: { orders: { where: { status: { in: ["confirmed", "delivering"] } } } } },
    },
  });

  const data = chauffeurs.map((d) => ({
    id: d.id,
    fullName: d.user.fullName,
    email: d.user.email,
    phone: d.phone,
    commune: d.commune,
    vehicle: d.vehicle,
    status: d.status,
    activeOrders: d._count.orders,
  }));

  return (
    <>
      <PageHeader overline="Administration" title="Chauffeurs" />
      <GestionChauffeurs chauffeurs={data} />
    </>
  );
}
