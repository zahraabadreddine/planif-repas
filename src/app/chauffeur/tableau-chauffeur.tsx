"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fcfa, cx } from "@/lib/format";
import { TruckIcon, PackageIcon, CheckIcon, ClockIcon, MapIcon, ChevronRight } from "@/components/icones";

type Item = { name: string; quantity: number; unit: string; priceFcfa: number };
type Point = { name: string; address: string; commune: string; phone: string | null };
type Commande = {
  id: string;
  status: string;
  totalFcfa: number;
  createdAt: string;
  household: string;
  point: Point;
  items: Item[];
};

const STATUS_LABEL: Record<string, string> = {
  confirmed: "À récupérer",
  delivering: "En livraison",
  delivered: "Livrée",
};

const ACTIONS: Record<string, { label: string; next: string; style: string }> = {
  confirmed: {
    label: "J'ai récupéré la commande",
    next: "delivering",
    style: "bg-sirop text-creme",
  },
  delivering: {
    label: "Commande livrée !",
    next: "delivered",
    style: "bg-palme text-creme",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TableauChauffeur({
  commandes,
  driverStatus,
}: {
  commandes: Commande[];
  driverStatus: string;
}) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [enChargement, setEnChargement] = useState<string | null>(null);
  const [enToggle, setEnToggle] = useState(false);
  const [statut, setStatut] = useState(driverStatus);
  const [flash, setFlash] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => { setStatut(driverStatus); }, [driverStatus]);

  async function toggleStatut() {
    const prochain = statut === "available" ? "offline" : "available";
    setEnToggle(true);
    try {
      const res = await fetch("/api/chauffeur/statut", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: prochain }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStatut(data.status);
      if (prochain === "available" && data.status === "busy") {
        setFlash("Une commande t'a été assignée automatiquement !");
        setTimeout(() => setFlash(null), 4000);
      }
      startTransition(() => router.refresh());
    } finally {
      setEnToggle(false);
    }
  }

  const actives = commandes.filter((c) => c.status === "confirmed" || c.status === "delivering");
  const terminees = commandes.filter((c) => c.status === "delivered" || c.status === "received");

  async function changerStatut(id: string, next: string) {
    setEnChargement(id);
    try {
      const res = await fetch(`/api/chauffeur/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      if (next === "delivered") setStatut("available");
      if (next === "delivering") setStatut("busy");
      startTransition(() => router.refresh());
    } finally {
      setEnChargement(null);
    }
  }

  return (
    <div className="mt-4">
      {/* Status indicator + toggle */}
      <div
        className={cx(
          "rounded-[14px_18px_16px_12px] border-[2.5px] px-4 py-3",
          statut === "available"
            ? "border-palme bg-palme/15"
            : statut === "busy"
              ? "border-sirop bg-mangue/30"
              : "border-cacao/30 bg-sable/50",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-sm font-bold">
              {statut === "available" && "En ligne"}
              {statut === "busy" && "En course"}
              {statut === "offline" && "Hors ligne"}
            </p>
            <p className="text-[11px] text-cacao">
              {statut === "available" && "Tu recevras des commandes automatiquement"}
              {statut === "busy" && `${actives.length} livraison${actives.length !== 1 ? "s" : ""} en cours`}
              {statut === "offline" && "Active-toi pour recevoir des commandes"}
            </p>
          </div>
          {statut !== "busy" && (
            <button
              disabled={enToggle}
              onClick={toggleStatut}
              className={cx(
                "relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors",
                statut === "available"
                  ? "border-palme bg-palme"
                  : "border-cacao/30 bg-sable",
              )}
            >
              <span
                className={cx(
                  "absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-creme shadow transition-transform",
                  statut === "available" ? "translate-x-6" : "translate-x-0",
                )}
              />
            </button>
          )}
        </div>
      </div>

      {flash && (
        <div className="mt-2 rounded-[10px_14px_12px_8px] border-2 border-sirop bg-mangue/30 px-4 py-2.5 text-center font-display text-sm font-bold text-sirop">
          {flash}
        </div>
      )}

      {/* Active deliveries */}
      {actives.length > 0 && (
        <div className="mt-5">
          <h2 className="font-display text-sm font-bold text-puce">À livrer</h2>
          <div className="mt-2 flex flex-col gap-3">
            {actives.map((c) => (
              <CommandeChauffeur
                key={c.id}
                commande={c}
                ouvert={ouvert === c.id}
                onToggle={() => setOuvert(ouvert === c.id ? null : c.id)}
                onAction={changerStatut}
                enChargement={enChargement === c.id}
              />
            ))}
          </div>
        </div>
      )}

      {actives.length === 0 && (
        <div className="mt-6 rounded-[14px_18px_16px_12px] border-[2.5px] border-sable bg-[#FFFDF7] px-5 py-6 text-center">
          <p className="font-hand text-xl font-bold text-puce">Pas de livraison en cours</p>
          <p className="mt-1 text-sm text-cacao">
            Les nouvelles commandes apparaîtront ici dès qu'elles seront assignées.
          </p>
        </div>
      )}

      {/* History */}
      {terminees.length > 0 && (
        <div className="mt-6">
          <h2 className="font-display text-sm font-bold text-cacao">Historique</h2>
          <div className="mt-2 flex flex-col gap-2">
            {terminees.slice(0, 10).map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-[10px_14px_12px_8px] border border-sable bg-[#FFFDF7] px-3 py-2"
              >
                <CheckIcon size={14} className="shrink-0 text-palme" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foret">{c.household}</p>
                  <p className="text-[11px] text-canard">{c.point.commune} · {formatDate(c.createdAt)}</p>
                </div>
                <span className="shrink-0 font-display text-xs font-bold text-puce">{fcfa(c.totalFcfa)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CommandeChauffeur({
  commande: c,
  ouvert,
  onToggle,
  onAction,
  enChargement,
}: {
  commande: Commande;
  ouvert: boolean;
  onToggle: () => void;
  onAction: (id: string, next: string) => void;
  enChargement: boolean;
}) {
  const action = ACTIONS[c.status];

  return (
    <div className="paper-shadow bg-[#FFFDF7] px-4 py-3.5">
      <button onClick={onToggle} className="flex w-full items-start justify-between gap-2 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {c.status === "delivering" ? (
              <TruckIcon size={16} className="text-sirop" />
            ) : (
              <PackageIcon size={16} className="text-canard" />
            )}
            <span className="truncate font-display text-[15px] font-bold text-foret">
              {c.household}
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-canard">
            <MapIcon size={12} />
            {c.point.name} · {c.point.commune}
          </p>
          <p className="text-[11px] text-cacao">{formatDate(c.createdAt)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-display text-sm font-bold text-puce">{fcfa(c.totalFcfa)}</span>
          <span
            className={cx(
              "rounded-full px-2 py-0.5 text-[10px] font-bold",
              c.status === "delivering" ? "bg-mangue/30 text-sirop" : "bg-lagon/20 text-canard",
            )}
          >
            {STATUS_LABEL[c.status]}
          </span>
        </div>
      </button>

      {ouvert && (
        <div className="mt-3 border-t border-sable pt-3">
          <p className="text-xs text-canard">{c.point.address}</p>
          {c.point.phone && <p className="mt-0.5 text-xs font-bold text-foret">Tél : {c.point.phone}</p>}

          <h4 className="mt-2 text-xs font-bold text-puce">Articles à livrer</h4>
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
        </div>
      )}

      {action && (
        <button
          disabled={enChargement}
          onClick={() => onAction(c.id, action.next)}
          className={cx(
            "mt-3 flex w-full items-center justify-center gap-2 rounded-[14px_18px_16px_12px] px-4 py-3 font-display text-sm font-bold transition-transform disabled:opacity-50",
            action.style,
          )}
        >
          {c.status === "confirmed" ? <PackageIcon size={16} /> : <CheckIcon size={16} />}
          {enChargement ? "…" : action.label}
        </button>
      )}
    </div>
  );
}
