"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/titre-page";

type Magasin = {
  id: string;
  name: string;
  type: string;
  address: string;
  neighborhood: { name: string } | null;
};

export default function AdminMagasinsPage() {
  const [items, setItems] = useState<Magasin[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    fetch("/api/admin/stores")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setItems(d.stores))
      .catch(() => setErreur("Impossible de charger les magasins."))
      .finally(() => setChargement(false));
  }, []);

  async function supprimer(id: string) {
    if (!confirm("Supprimer ce magasin ?")) return;
    const r = await fetch(`/api/admin/stores/${id}`, { method: "DELETE" });
    if (r.ok) setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <>
      <PageHeader
        overline="Administration"
        title="Magasins"
        right={
          <Link href="/admin" className="text-sm font-bold text-palme underline">
            Retour
          </Link>
        }
      />

      {chargement && <p className="mt-6 font-bold text-cacao">Chargement…</p>}
      {erreur && <p className="mt-6 font-bold text-carmin">{erreur}</p>}

      {!chargement && items.length === 0 && !erreur && (
        <p className="mt-6 font-bold text-cacao">Aucun magasin enregistré.</p>
      )}

      <div className="mt-4 space-y-3">
        {items.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-sable/60 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-display font-semibold text-foret">{m.name}</p>
              <p className="text-sm text-cacao">
                {m.type} · {m.address}
                {m.neighborhood && ` · ${m.neighborhood.name}`}
              </p>
            </div>
            <button
              onClick={() => supprimer(m.id)}
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
