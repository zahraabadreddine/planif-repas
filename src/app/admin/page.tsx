import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/titre-page";
import { fcfa } from "@/lib/format";
import {
  TruckIcon,
  UserIcon,
  PackageIcon,
  ChartIcon,
  ChevronRight,
  ClockIcon,
  CheckIcon,
} from "@/components/icones";

const cartes = [
  { href: "/admin/recettes", label: "Recettes", icone: "🍜" },
  { href: "/admin/ingredients", label: "Ingrédients", icone: "🥕" },
  { href: "/admin/prix", label: "Prix", icone: "💰" },
  { href: "/admin/magasins", label: "Magasins", icone: "🏪" },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icone: "👥" },
];

export default async function AdminPage() {
  const maintenant = new Date();
  const debutJour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  const debutSemaine = new Date(debutJour);
  debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay());
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

  const [
    utilisateurs,
    foyers,
    recettes,
    ingredients,
    menus,
    conversations,
    commandesJour,
    commandesSemaine,
    commandesMois,
    commandesPending,
    commandesEnLivraison,
    commandesLivrees,
    chauffeurs,
    chauffeursActifs,
    revenueTotal,
    revenueJour,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.household.count(),
    prisma.recipe.count({ where: { householdId: null } }),
    prisma.ingredient.count(),
    prisma.mealPlan.count(),
    prisma.conversation.count(),
    prisma.deliveryOrder.count({ where: { createdAt: { gte: debutJour } } }),
    prisma.deliveryOrder.count({ where: { createdAt: { gte: debutSemaine } } }),
    prisma.deliveryOrder.count({ where: { createdAt: { gte: debutMois } } }),
    prisma.deliveryOrder.count({ where: { status: "pending" } }),
    prisma.deliveryOrder.count({ where: { status: "delivering" } }),
    prisma.deliveryOrder.count({ where: { status: { in: ["delivered", "received"] } } }),
    prisma.driver.count(),
    prisma.driver.count({ where: { status: "available" } }),
    prisma.deliveryOrder.aggregate({ _sum: { totalFcfa: true }, where: { status: { in: ["delivered", "received"] } } }),
    prisma.deliveryOrder.aggregate({
      _sum: { totalFcfa: true },
      where: { status: { in: ["delivered", "received"] }, createdAt: { gte: debutJour } },
    }),
  ]);

  const dernieresCommandes = await prisma.deliveryOrder.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      household: { select: { name: true } },
      deliveryPoint: { select: { name: true, commune: true } },
      driver: { include: { user: { select: { fullName: true } } } },
    },
  });

  const revTotal = revenueTotal._sum.totalFcfa ?? 0;
  const revJour = revenueJour._sum.totalFcfa ?? 0;

  const STATUS_STYLE: Record<string, string> = {
    pending: "bg-mangue/30 text-sirop",
    confirmed: "bg-lagon/20 text-canard",
    delivering: "bg-rose/30 text-puce",
    delivered: "bg-palme/20 text-foret",
    received: "bg-palme/20 text-foret",
    cancelled: "bg-carmin/10 text-carmin",
  };
  const STATUS_LABEL: Record<string, string> = {
    pending: "En attente",
    confirmed: "Confirmée",
    delivering: "En livraison",
    delivered: "Livrée",
    received: "Reçue",
    cancelled: "Annulée",
  };

  return (
    <>
      <PageHeader overline="Administration" title="Centre de commande" />

      {/* --- Delivery stats (hero) --- */}
      <section className="mt-5 md:mt-8">
        <h2 className="font-display text-base font-bold text-puce md:text-lg">Delivery</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:mt-5 md:grid-cols-3 md:gap-5">
          <StatCard icon={<PackageIcon size={18} />} label="Commandes aujourd'hui" value={String(commandesJour)} accent="foret" />
          <StatCard icon={<ChartIcon size={18} />} label="Revenu du jour" value={fcfa(revJour)} accent="palme" />
          <StatCard icon={<ClockIcon size={18} />} label="En attente" value={String(commandesPending)} accent="sirop" highlight={commandesPending > 0} />
          <StatCard icon={<TruckIcon size={18} />} label="En livraison" value={String(commandesEnLivraison)} accent="canard" />
          <StatCard icon={<CheckIcon size={18} />} label="Livrées (total)" value={String(commandesLivrees)} accent="palme" />
          <StatCard icon={<UserIcon size={18} />} label="Chauffeurs dispo" value={`${chauffeursActifs} / ${chauffeurs}`} accent="foret" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 md:mt-5 md:gap-4">
          <MiniStat label="Semaine" value={String(commandesSemaine)} />
          <MiniStat label="Mois" value={String(commandesMois)} />
          <MiniStat label="Revenu total" value={fcfa(revTotal)} />
        </div>
      </section>

      {/* --- Quick actions --- */}
      <section className="mt-6 flex gap-2 md:mt-10 md:gap-4">
        <Link
          href="/admin/commandes"
          className="press flex flex-1 items-center justify-center gap-2 rounded-[14px_18px_16px_12px] border-[2.5px] border-sirop bg-mangue/40 px-3 py-3 font-display text-sm font-bold text-sirop shadow-[0_3px_0_#411102] transition-transform md:py-4 md:text-base"
        >
          <PackageIcon size={16} /> Commandes
          {commandesPending > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-carmin px-1.5 text-[10px] font-bold text-creme">
              {commandesPending}
            </span>
          )}
        </Link>
        <Link
          href="/admin/chauffeurs"
          className="press flex flex-1 items-center justify-center gap-2 rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-palme/20 px-3 py-3 font-display text-sm font-bold text-foret shadow-[0_3px_0_#411102] transition-transform md:py-4 md:text-base"
        >
          <TruckIcon size={16} /> Chauffeurs
        </Link>
      </section>

      {/* --- Recent orders --- */}
      <section className="mt-6 md:mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-cacao md:text-lg">Dernières commandes</h2>
          <Link href="/admin/commandes" className="flex items-center gap-0.5 text-xs font-bold text-palme md:text-sm">
            Tout voir <ChevronRight size={12} />
          </Link>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 md:mt-4 md:grid-cols-2 md:gap-4">
          {dernieresCommandes.length === 0 && (
            <p className="text-sm text-cacao">Aucune commande pour le moment.</p>
          )}
          {dernieresCommandes.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-[10px_14px_12px_8px] border border-sable bg-[#FFFDF7] px-3 py-2.5 md:px-5 md:py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foret md:text-base">
                  #{c.id.slice(0, 8).toUpperCase()} → {c.deliveryPoint?.name}
                </p>
                <p className="text-[11px] text-canard md:text-xs">
                  {c.deliveryPoint?.commune} · {formatDate(c.createdAt)}
                  {c.driver && <> · <span className="font-bold">{c.driver.user.fullName}</span></>}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-display text-xs font-bold text-puce md:text-sm">{fcfa(c.totalFcfa)}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold md:text-xs ${STATUS_STYLE[c.status] ?? ""}`}>
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- App stats --- */}
      <section className="mt-8 md:mt-12">
        <h2 className="font-display text-base font-bold text-cacao md:text-lg">Application</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 md:mt-5 md:gap-4">
          <MiniStat label="Utilisateurs" value={String(utilisateurs)} />
          <MiniStat label="Foyers" value={String(foyers)} />
          <MiniStat label="Recettes" value={String(recettes)} />
          <MiniStat label="Ingrédients" value={String(ingredients)} />
          <MiniStat label="Menus" value={String(menus)} />
          <MiniStat label="Conversations" value={String(conversations)} />
        </div>
      </section>

      {/* --- Management cards --- */}
      <section className="mt-6 pb-4 md:mt-10 md:pb-8">
        <h2 className="font-display text-base font-bold text-cacao md:text-lg">Gestion</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 md:mt-5 md:gap-4">
          {cartes.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="press flex flex-col items-center gap-1.5 rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-creme px-3 py-3.5 font-display text-xs font-semibold text-foret shadow-[0_3px_0_#411102] transition-transform md:gap-2.5 md:px-5 md:py-5 md:text-sm"
            >
              <span className="text-2xl md:text-3xl">{c.icone}</span>
              {c.label}
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

const ACCENT: Record<string, string> = {
  foret: "text-foret",
  palme: "text-palme",
  sirop: "text-sirop",
  canard: "text-canard",
};

function StatCard({
  icon,
  label,
  value,
  accent,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
  highlight?: boolean;
}) {
  const cls = ACCENT[accent] ?? "text-foret";
  return (
    <div
      className={`rounded-[14px_18px_16px_12px] border-[2.5px] px-4 py-3 md:px-6 md:py-5 ${
        highlight
          ? "border-sirop bg-mangue/30 animate-pulse"
          : "border-foret bg-sable/60"
      }`}
    >
      <div className="flex items-center gap-1.5 md:gap-2">
        <span className={cls}>{icon}</span>
        <p className="text-xs font-bold text-cacao md:text-sm">{label}</p>
      </div>
      <p className={`mt-1 font-display text-xl font-bold md:mt-2 md:text-3xl ${cls}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px_14px_12px_8px] border border-sable bg-[#FFFDF7] px-3 py-2 text-center md:px-5 md:py-3.5">
      <p className="text-[10px] font-bold text-cacao md:text-xs">{label}</p>
      <p className="font-display text-sm font-bold text-foret md:mt-1 md:text-lg">{value}</p>
    </div>
  );
}

function formatDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
