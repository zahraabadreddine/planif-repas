"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/titre-page";
import { fcfa } from "@/lib/format";

type Prix = {
  id: string;
  priceFcfa: number;
  placeType: string;
  city: string;
  observedAt: string;
  ingredient: { name: string };
  unit: { abbreviation: string };
  store: { name: string } | null;
};

export default function AdminPrixPage() {
  const [items, setItems] = useState<Prix[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    fetch("/api/admin/prices")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setItems(d.prices))
      .catch(() => setErreur("Impossible de charger les prix."))
      .finally(() => setChargement(false));
  }, []);

  async function supprimer(id: string) {
    if (!confirm("Supprimer ce prix ?")) return;
    const r = await fetch(`/api/admin/prices/${id}`, { method: "DELETE" });
    if (r.ok) setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <>
      <PageHeader
        overline="Administration"
        title="Prix"
        right={
          <Link href="/admin" className="text-sm font-bold text-palme underline">
            Retour
          </Link>
        }
      />

      {chargement && <p className="mt-6 font-bold text-cacao">Chargement…</p>}
      {erreur && <p className="mt-6 font-bold text-carmin">{erreur}</p>}

      {!chargement && items.length === 0 && !erreur && (
        <p className="mt-6 font-bold text-cacao">Aucun prix enregistré.</p>
      )}

      <div className="mt-4 space-y-3">
        {items.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between gap-3 rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-sable/60 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-display font-semibold text-foret">
                {p.ingredient.name} — {fcfa(p.priceFcfa)}/{p.unit.abbreviation}
              </p>
              <p className="text-sm text-cacao">
                {p.placeType} · {p.city}
                {p.store && ` · ${p.store.name}`}
                {" · "}
                {new Date(p.observedAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
            <button
              onClick={() => supprimer(p.id)}
              className="shrink-0 rounded-lg bg-carmin px-3 py-1.5 text-sm font-bold text-creme"
            >
              Suppr.
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
