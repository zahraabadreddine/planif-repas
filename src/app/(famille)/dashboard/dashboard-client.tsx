"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/titre-page";
import { HandNote } from "@/components/main-levee";
import { WalletIcon, TruckIcon, CartIcon, ChartIcon } from "@/components/icones";
import { fcfa, cx } from "@/lib/format";

type Achat = {
  date: string;
  ingredient: string;
  categorie: string | null;
};
type Commande = {
  date: string;
  total: number;
  livraison: number;
  type: string;
  statut: string;
};
type Budget = {
  date: string;
  budget: number;
  statut: string;
};

type Props = {
  donnees: {
    achats: Achat[];
    commandes: Commande[];
    budgets: Budget[];
    debutMois: string;
  };
};

type Periode = "mois" | "precedent";

function StatCard({
  label,
  value,
  icon,
  accent = "bg-palme/10 text-palme",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="paper-shadow flex items-center gap-3 bg-[#FFFDF7] px-4 py-3.5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-cacao">{label}</p>
        <p className="font-display text-lg font-bold text-foret">{value}</p>
      </div>
    </div>
  );
}

function BarreHorizontale({
  label,
  montant,
  max,
  couleur = "bg-palme",
}: {
  label: string;
  montant: number;
  max: number;
  couleur?: string;
}) {
  const pct = max > 0 ? Math.min((montant / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-24 shrink-0 truncate text-xs font-bold text-canard">{label}</span>
      <div className="flex h-5 flex-1 rounded-full bg-sable/60">
        <div
          className={`h-full rounded-full ${couleur} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-20 shrink-0 text-right text-xs font-bold text-puce">{fcfa(montant)}</span>
    </div>
  );
}

export function DashboardClient({ donnees }: Props) {
  const [periode, setPeriode] = useState<Periode>("mois");

  const debutMois = new Date(donnees.debutMois);
  const debutMoisPrec = new Date(debutMois.getFullYear(), debutMois.getMonth() - 1, 1);
  const cutoff = periode === "mois" ? debutMois : debutMoisPrec;
  const cutoffFin = periode === "precedent" ? debutMois : undefined;

  const filtrer = <T extends { date: string }>(items: T[]) =>
    items.filter((i) => {
      const d = new Date(i.date);
      return d >= cutoff && (!cutoffFin || d < cutoffFin);
    });

  const achatsFiltres = useMemo(() => filtrer(donnees.achats), [donnees.achats, periode]);
  const commandesFiltrees = useMemo(() => filtrer(donnees.commandes), [donnees.commandes, periode]);
  const budgetsFiltres = useMemo(() => filtrer(donnees.budgets), [donnees.budgets, periode]);

  const nbAchats = achatsFiltres.length;
  const totalDelivery = commandesFiltrees.reduce((s, c) => s + c.total, 0);
  const totalLivraison = commandesFiltrees.reduce((s, c) => s + c.livraison, 0);
  const totalGeneral = totalDelivery;
  const budgetMoyen =
    budgetsFiltres.length > 0
      ? budgetsFiltres.reduce((s, b) => s + b.budget, 0) / budgetsFiltres.length
      : 0;

  const parCategorie = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of commandesFiltrees) {
      map[c.type === "delivery" ? "Livraison" : "Retrait"] =
        (map[c.type === "delivery" ? "Livraison" : "Retrait"] ?? 0) + c.total;
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [commandesFiltrees]);

  const maxCategorie = parCategorie.length > 0 ? parCategorie[0][1] : 1;

  const nomMois = (d: Date) =>
    d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="-mx-5 -mb-[190px] -mt-6 min-h-dvh bg-creme pb-[190px]">
      <div className="px-5 pt-6">
        <PageHeader overline="Tableau de bord" title="Mes dépenses" overlineClassName="text-cacao" />
      </div>

      {/* Sélection période */}
      <div className="mt-4 flex gap-2 px-5">
        <button
          onClick={() => setPeriode("mois")}
          className={cx(
            "press flex h-10 flex-1 items-center justify-center rounded-[14px_18px_16px_12px] text-sm font-extrabold transition-colors",
            periode === "mois" ? "bg-palme text-creme" : "bg-sable text-puce",
          )}
        >
          {nomMois(debutMois)}
        </button>
        <button
          onClick={() => setPeriode("precedent")}
          className={cx(
            "press flex h-10 flex-1 items-center justify-center rounded-[14px_18px_16px_12px] text-sm font-extrabold transition-colors",
            periode === "precedent" ? "bg-palme text-creme" : "bg-sable text-puce",
          )}
        >
          {nomMois(debutMoisPrec)}
        </button>
      </div>

      {/* Cartes résumé */}
      <div className="mt-5 grid grid-cols-2 gap-3 px-5">
        <StatCard
          label="Total dépenses"
          value={fcfa(totalGeneral)}
          icon={<WalletIcon size={20} />}
          accent="bg-mangue/20 text-sirop"
        />
        <StatCard
          label="Budget moyen"
          value={budgetMoyen > 0 ? fcfa(budgetMoyen) : "—"}
          icon={<ChartIcon size={20} />}
          accent="bg-palme/15 text-palme"
        />
        <StatCard
          label="Achats marché"
          value={`${nbAchats} achat${nbAchats > 1 ? "s" : ""}`}
          icon={<CartIcon size={20} />}
          accent="bg-lagon/20 text-canard"
        />
        <StatCard
          label="Delivery"
          value={fcfa(totalDelivery)}
          icon={<TruckIcon size={20} />}
          accent="bg-sirop/15 text-carmin"
        />
      </div>

      {totalLivraison > 0 && (
        <div className="mt-2 px-5">
          <HandNote tilt={-3} className="text-sm text-cacao">
            Dont {fcfa(totalLivraison)} de frais de livraison
          </HandNote>
        </div>
      )}

      {/* Répartition delivery */}
      {parCategorie.length > 0 && (
        <div className="mt-6 px-5">
          <h2 className="font-display text-[15px] font-bold text-foret">Répartition delivery</h2>
          <div className="mt-3 flex flex-col gap-2">
            {parCategorie.map(([cat, montant]) => (
              <BarreHorizontale
                key={cat}
                label={cat}
                montant={montant}
                max={maxCategorie}
                couleur="bg-palme"
              />
            ))}
          </div>
        </div>
      )}

      {/* Historique commandes delivery */}
      {commandesFiltrees.length > 0 && (
        <div className="mt-6 px-5">
          <h2 className="font-display text-[15px] font-bold text-foret">
            Commandes delivery
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {commandesFiltrees.map((c, i) => (
              <div
                key={i}
                className="paper-shadow flex items-center justify-between bg-[#FFFDF7] px-4 py-2.5"
              >
                <div>
                  <p className="text-sm font-bold text-foret">
                    {new Date(c.date).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                  <p className="text-xs text-cacao">
                    {c.type === "delivery" ? "Livraison" : "Retrait"} ·{" "}
                    {c.statut === "delivered"
                      ? "Livré"
                      : c.statut === "pending"
                        ? "En attente"
                        : c.statut === "confirmed"
                          ? "Confirmé"
                          : c.statut === "delivering"
                            ? "En route"
                            : c.statut === "cancelled"
                              ? "Annulé"
                              : c.statut}
                  </p>
                </div>
                <span className="font-display text-sm font-bold text-puce">{fcfa(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* État vide */}
      {totalGeneral === 0 && commandesFiltrees.length === 0 && (
        <div className="mt-10 px-5 text-center">
          <p className="font-hand text-xl text-puce">
            Pas encore de dépenses ce mois-ci !
          </p>
          <p className="mt-1 text-sm text-cacao">
            Tes achats et commandes delivery apparaîtront ici.
          </p>
        </div>
      )}
    </div>
  );
}
