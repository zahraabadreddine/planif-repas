"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/titre-page";

type Magasin = {
  id: string;
  name: string;
  type: string;
  address: string;
  neighborhood: { name: string } | null;
};

const TYPE_BADGE: Record<string, string> = {
  supermarket: "bg-lagon/20 text-lagon",
  market: "bg-mangue/20 text-sirop",
  shop: "bg-palme/20 text-palme",
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
      <PageHeader overline="Administration" title="Magasins" />

      <p className="mt-1 text-sm text-cacao">
        {chargement ? "Chargement…" : `${items.length} magasin${items.length > 1 ? "s" : ""} enregistré${items.length > 1 ? "s" : ""}`}
      </p>

      {erreur && <p className="mt-4 rounded-xl bg-carmin/10 px-4 py-2 font-bold text-carmin">{erreur}</p>}

      {!chargement && items.length === 0 && !erreur && (
        <p className="mt-6 font-bold text-cacao">Aucun magasin enregistré.</p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {items.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-3 rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-sable/60 px-4 py-3 md:px-6 md:py-4"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate font-display font-semibold text-foret md:text-lg">{m.name}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold md:text-xs ${TYPE_BADGE[m.type] ?? "bg-sable text-cacao"}`}
                >
                  {m.type}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-cacao md:text-base">
                {m.address}
                {m.neighborhood && ` · ${m.neighborhood.name}`}
              </p>
            </div>
            <button
              onClick={() => supprimer(m.id)}
              className="shrink-0 rounded-lg bg-carmin/10 px-3 py-1 text-sm font-bold text-carmin md:px-4 md:py-2 md:text-base"
            >
              Supprimer
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
