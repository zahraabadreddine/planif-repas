"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/titre-page";
import { HandNote } from "@/components/main-levee";
import { TruckIcon, PackageIcon, CheckIcon, ClockIcon, ChevronRight, CloseIcon } from "@/components/icones";
import { fcfa, cx } from "@/lib/format";

type Item = {
  name: string;
  quantity: number;
  unit: string;
  priceFcfa: number;
};

type Commande = {
  id: string;
  status: "pending" | "confirmed" | "delivering" | "delivered" | "cancelled";
  type: "delivery" | "pickup";
  totalFcfa: number;
  deliveryFeeFcfa: number;
  createdAt: string;
  updatedAt: string;
  point: { name: string; address: string; phone: string | null };
  items: Item[];
};

type Props = { commandes: Commande[] };

const ETAPES = ["pending", "confirmed", "delivering", "delivered"] as const;

const LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  delivering: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const LABELS_PICKUP: Record<string, string> = {
  pending: "En attente",
  confirmed: "Prête",
  delivering: "À récupérer",
  delivered: "Récupérée",
  cancelled: "Annulée",
};

function indexEtape(status: string) {
  const idx = ETAPES.indexOf(status as (typeof ETAPES)[number]);
  return idx === -1 ? -1 : idx;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function EtapeIcon({ etape, actif, fait }: { etape: string; actif: boolean; fait: boolean }) {
  const base = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors";
  if (fait) {
    return (
      <div className={cx(base, "border-palme bg-palme text-creme")}>
        <CheckIcon size={14} />
      </div>
    );
  }
  if (actif) {
    return (
      <div className={cx(base, "border-sirop bg-sirop text-creme")}>
        {etape === "delivering" ? <TruckIcon size={14} /> : <ClockIcon size={14} />}
      </div>
    );
  }
  return <div className={cx(base, "border-cacao/30 bg-sable/50")} />;
}

function TimelineLivraison({ status, type }: { status: string; type: "delivery" | "pickup" }) {
  const idx = indexEtape(status);
  const labels = type === "pickup" ? LABELS_PICKUP : LABELS;

  if (status === "cancelled") {
    return (
      <div className="mt-3 rounded-[10px_14px_12px_8px] bg-carmin/10 px-3 py-2 text-center">
        <span className="font-hand text-sm font-bold text-carmin">Commande annulée</span>
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-start gap-0">
      {ETAPES.map((etape, i) => {
        const fait = i < idx;
        const actif = i === idx;
        return (
          <div key={etape} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              {i > 0 && (
                <div
                  className={cx(
                    "h-0.5 flex-1 transition-colors",
                    i <= idx ? "bg-palme" : "bg-cacao/20",
                  )}
                />
              )}
              <EtapeIcon etape={etape} actif={actif} fait={fait} />
              {i < ETAPES.length - 1 && (
                <div
                  className={cx(
                    "h-0.5 flex-1 transition-colors",
                    i < idx ? "bg-palme" : "bg-cacao/20",
                  )}
                />
              )}
            </div>
            <span
              className={cx(
                "mt-1 text-center text-[10px] leading-tight",
                actif ? "font-bold text-sirop" : fait ? "font-bold text-palme" : "text-cacao",
              )}
            >
              {labels[etape]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

async function changerStatut(id: string, status: string) {
  const res = await fetch(`/api/delivery/orders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Échec de la mise à jour");
  return res.json();
}

export function SuiviClient({ commandes }: Props) {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [enChargement, setEnChargement] = useState<string | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function onAction(id: string, status: string) {
    setEnChargement(id);
    try {
      await changerStatut(id, status);
      startTransition(() => router.refresh());
    } catch {
      /* silently handled — the UI stays in its current state */
    } finally {
      setEnChargement(null);
    }
  }

  const enCours = commandes.filter((c) => c.status !== "delivered" && c.status !== "cancelled");
  const terminees = commandes.filter((c) => c.status === "delivered" || c.status === "cancelled");

  return (
    <div className="-mx-5 -mb-[190px] -mt-6 flex min-h-dvh flex-col bg-creme pb-[190px]">
      <div className="px-5 pt-6">
        <PageHeader overline="Mes commandes" title="Suivi livraison" overlineClassName="text-sirop" />
        <Link
          href="/delivery"
          className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-palme underline"
        >
          Nouvelle commande <ChevronRight size={14} />
        </Link>
      </div>

      {commandes.length === 0 && (
        <div className="mt-8 px-5">
          <div className="paper-shadow bg-[#FFFDF7] px-[18px] py-5 text-center">
            <p className="font-hand text-[23px] font-bold leading-tight text-puce">
              Aucune commande pour le moment
            </p>
            <p className="mt-1 text-sm text-cacao">
              Passe ta première commande depuis la section Delivery !
            </p>
          </div>
        </div>
      )}

      {enCours.length > 0 && (
        <div className="mt-5 px-5">
          <h2 className="font-display text-sm font-bold text-puce">En cours</h2>
          <div className="mt-2 flex flex-col gap-3">
            {enCours.map((c) => (
              <CommandeCard
                key={c.id}
                commande={c}
                ouvert={ouvert === c.id}
                onToggle={() => setOuvert(ouvert === c.id ? null : c.id)}
                onAction={onAction}
                enChargement={enChargement === c.id}
              />
            ))}
          </div>
        </div>
      )}

      {terminees.length > 0 && (
        <div className="mt-6 px-5">
          <h2 className="font-display text-sm font-bold text-cacao">Historique</h2>
          <div className="mt-2 flex flex-col gap-3">
            {terminees.map((c) => (
              <CommandeCard
                key={c.id}
                commande={c}
                ouvert={ouvert === c.id}
                onToggle={() => setOuvert(ouvert === c.id ? null : c.id)}
                onAction={onAction}
                enChargement={enChargement === c.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ACTIONS: Record<string, { label: string; next: string }[]> = {
  pending: [{ label: "Annuler", next: "cancelled" }],
  confirmed: [{ label: "Annuler", next: "cancelled" }],
  delivering: [
    { label: "Bien reçu !", next: "delivered" },
    { label: "Annuler", next: "cancelled" },
  ],
};

function CommandeCard({
  commande: c,
  ouvert,
  onToggle,
  onAction,
  enChargement,
}: {
  commande: Commande;
  ouvert: boolean;
  onToggle: () => void;
  onAction: (id: string, status: string) => void;
  enChargement: boolean;
}) {
  const labels = c.type === "pickup" ? LABELS_PICKUP : LABELS;

  return (
    <div className="paper-shadow bg-[#FFFDF7] px-4 py-3.5">
      <button onClick={onToggle} className="flex w-full items-start justify-between gap-2 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {c.type === "delivery" ? <TruckIcon size={16} /> : <PackageIcon size={16} />}
            <span className="truncate font-display text-[15px] font-bold text-foret">
              {c.point.name}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-canard">{formatDate(c.createdAt)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-display text-sm font-bold text-puce">{fcfa(c.totalFcfa)}</span>
          <HandNote
            tilt={-2}
            className={cx(
              "text-xs",
              c.status === "delivered"
                ? "text-palme"
                : c.status === "cancelled"
                  ? "text-carmin"
                  : "text-sirop",
            )}
          >
            {labels[c.status]}
          </HandNote>
        </div>
      </button>

      <TimelineLivraison status={c.status} type={c.type} />

      {ouvert && (
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
        </div>
      )}

      {ACTIONS[c.status] && (
        <div className="mt-3 flex gap-2 border-t border-sable pt-3">
          {ACTIONS[c.status].map((action) => {
            const isCancel = action.next === "cancelled";
            return (
              <button
                key={action.next}
                disabled={enChargement}
                onClick={() => onAction(c.id, action.next)}
                className={cx(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-[10px_14px_12px_8px] px-3 py-2 text-sm font-bold transition-colors disabled:opacity-50",
                  isCancel
                    ? "bg-carmin/10 text-carmin"
                    : "bg-palme text-creme",
                )}
              >
                {isCancel ? <CloseIcon size={14} /> : <CheckIcon size={14} />}
                {enChargement ? "…" : action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
