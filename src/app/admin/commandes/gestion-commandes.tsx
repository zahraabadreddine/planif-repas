"use client";

import { useState } from "react";
import { fcfa, cx } from "@/lib/format";
import { TruckIcon, CheckIcon, ClockIcon, PackageIcon, UserIcon, BoltIcon } from "@/components/icones";

type Item = { name: string; quantity: number; unit: string; priceFcfa: number };
type Point = { name: string; address: string; commune: string; phone: string | null };
type Driver = { id: string; name: string; commune: string; status: string };
type Commande = {
  id: string;
  status: string;
  totalFcfa: number;
  deliveryFeeFcfa: number;
  createdAt: string;
  household: string;
  point: Point;
  driver: { id: string; name: string } | null;
  items: Item[];
};

const TABS = [
  { key: "pending", label: "En attente", icon: ClockIcon },
  { key: "confirmed", label: "Confirmées", icon: CheckIcon },
  { key: "delivering", label: "En cours", icon: TruckIcon },
  { key: "done", label: "Terminées", icon: PackageIcon },
] as const;

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  delivering: "En livraison",
  delivered: "Livrée",
  received: "Reçue",
  cancelled: "Annulée",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GestionCommandes({
  commandes,
  chauffeurs,
}: {
  commandes: Commande[];
  chauffeurs: Driver[];
}) {
  const [tab, setTab] = useState<string>("pending");
  const [ouvert, setOuvert] = useState<string | null>(null);

  const filtered =
    tab === "done"
      ? commandes.filter((c) => c.status === "delivered" || c.status === "received" || c.status === "cancelled")
      : commandes.filter((c) => c.status === tab);

  const pendingSansDriver = commandes.filter(
    (c) => c.status === "pending" && !c.driver,
  ).length;

  const disponibles = chauffeurs.filter((d) => d.status === "available").length;

  return (
    <div className="mt-4">
      {/* Info assignation automatique */}
      <div className="mb-4 rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-mangue/15 px-4 py-3">
        <div className="flex items-center gap-2">
          <BoltIcon size={15} />
          <div>
            <p className="text-xs font-bold text-foret">Assignation automatique</p>
            <p className="mt-0.5 text-[11px] text-cacao">
              Les commandes sont assignées automatiquement aux chauffeurs disponibles.
            </p>
          </div>
        </div>
        <div className="mt-2 flex gap-3 text-[11px] font-bold">
          <span className={pendingSansDriver > 0 ? "text-sirop" : "text-palme"}>
            {pendingSansDriver} en attente
          </span>
          <span className="text-canard">
            {disponibles} chauffeur{disponibles > 1 ? "s" : ""} dispo
          </span>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const count = t.key === "done"
            ? commandes.filter((c) => c.status === "delivered" || c.status === "received" || c.status === "cancelled").length
            : commandes.filter((c) => c.status === t.key).length;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cx(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                tab === t.key
                  ? "bg-foret text-creme"
                  : "bg-sable/60 text-cacao",
              )}
            >
              <Icon size={13} />
              {t.label}
              {count > 0 && (
                <span
                  className={cx(
                    "ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                    tab === t.key ? "bg-creme/30 text-creme" : "bg-cacao/15 text-cacao",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Liste des commandes */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-cacao">Aucune commande ici.</p>
        )}
        {filtered.map((c) => (
          <div key={c.id} className="paper-shadow bg-[#FFFDF7] px-4 py-3">
            <button
              onClick={() => setOuvert(ouvert === c.id ? null : c.id)}
              className="flex w-full items-start justify-between gap-2 text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[15px] font-bold text-foret">
                  #{c.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-[11px] font-bold text-canard">{c.household}</p>
                <p className="mt-0.5 text-xs text-canard">
                  {c.point.name} · {c.point.commune}
                </p>
                <p className="text-[11px] text-cacao">{formatDate(c.createdAt)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-display text-sm font-bold text-puce">{fcfa(c.totalFcfa)}</span>
                <StatusBadge status={c.status} />
                {c.driver ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-palme">
                    <UserIcon size={10} />
                    {c.driver.name}
                  </span>
                ) : c.status === "pending" ? (
                  <span className="text-[10px] font-bold text-sirop">Non assignée</span>
                ) : null}
              </div>
            </button>

            {ouvert === c.id && (
              <div className="mt-3 border-t border-sable pt-3">
                <p className="text-xs text-canard">{c.point.address}</p>
                {c.point.phone && <p className="mt-0.5 text-xs text-cacao">Tél : {c.point.phone}</p>}

                <h4 className="mt-2 text-xs font-bold text-puce">Articles</h4>
                <div className="mt-1 flex flex-col gap-1">
                  {c.items.map((item, i) => (
                    <div key={i} className="flex items-baseline justify-between text-xs">
                      <span className="text-foret">
                        {item.name} — {item.quantity} {item.unit}
                      </span>
                      <span className="font-bold text-cacao">{fcfa(item.priceFcfa * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                {c.deliveryFeeFcfa > 0 && (
                  <div className="mt-1.5 flex items-baseline justify-between border-t border-sable/50 pt-1.5 text-xs">
                    <span className="text-canard">Frais de livraison</span>
                    <span className="font-bold text-cacao">{fcfa(c.deliveryFeeFcfa)}</span>
                  </div>
                )}

                <div className="mt-1.5 flex items-baseline justify-between border-t border-sable pt-1.5">
                  <span className="font-display text-sm font-bold text-foret">Total</span>
                  <span className="font-display text-sm font-bold text-puce">{fcfa(c.totalFcfa)}</span>
                </div>

                {/* Info chauffeur (supervision) */}
                {c.driver && (
                  <div className="mt-3 rounded-lg bg-palme/10 px-3 py-2">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-palme">
                      <TruckIcon size={13} />
                      Chauffeur assigné : {c.driver.name}
                    </p>
                  </div>
                )}
                {!c.driver && c.status === "pending" && (
                  <div className="mt-3 rounded-lg bg-mangue/15 px-3 py-2">
                    <p className="text-xs font-bold text-sirop">
                      En attente d&apos;assignation automatique
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-mangue/30 text-sirop",
    confirmed: "bg-lagon/20 text-canard",
    delivering: "bg-rose/30 text-puce",
    delivered: "bg-palme/20 text-foret",
    received: "bg-palme/20 text-foret",
    cancelled: "bg-carmin/10 text-carmin",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${styles[status] ?? ""}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
