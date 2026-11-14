"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/titre-page";
import { fcfa, cx } from "@/lib/format";

type Prix = {
  id: string;
  priceFcfa: number;
  placeType: string;
  city: string;
  observedAt: string;
  ingredientId: string;
  unitId: string;
  storeId: string | null;
  source: string;
  ingredient: { name: string };
  unit: { label: string };
  store: { name: string } | null;
};

export default function AdminPrixPage() {
  const [items, setItems] = useState<Prix[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrix, setEditPrix] = useState("");
  const [editCity, setEditCity] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/prices")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setItems(d.prices))
      .catch(() => setErreur("Impossible de charger les prix."))
      .finally(() => setChargement(false));
  }, []);

  function ouvrir(p: Prix) {
    setEditId(p.id);
    setEditPrix(String(p.priceFcfa));
    setEditCity(p.city);
  }

  function fermer() {
    setEditId(null);
    setEditPrix("");
    setEditCity("");
  }

  async function enregistrer(p: Prix) {
    const nouveauPrix = parseInt(editPrix, 10);
    if (!nouveauPrix || nouveauPrix <= 0) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/prices/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientId: p.ingredientId,
          unitId: p.unitId,
          priceFcfa: nouveauPrix,
          placeType: p.placeType,
          storeId: p.storeId,
          city: editCity.trim() || p.city,
          source: p.source || "team",
          observedAt: new Date().toISOString(),
        }),
      });
      if (r.ok) {
        const d = await r.json();
        setItems((prev) => prev.map((x) => (x.id === d.price.id ? d.price : x)));
        fermer();
      }
    } finally {
      setSaving(false);
    }
  }

  async function supprimer(id: string) {
    if (!confirm("Supprimer ce prix ?")) return;
    const r = await fetch(`/api/admin/prices/${id}`, { method: "DELETE" });
    if (r.ok) setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <>
      <PageHeader overline="Administration" title="Prix" />

      <p className="mt-1 text-sm text-cacao">
        {chargement ? "Chargement…" : `${items.length} prix enregistré${items.length > 1 ? "s" : ""}`}
      </p>

      {erreur && <p className="mt-4 rounded-xl bg-carmin/10 px-4 py-2 font-bold text-carmin">{erreur}</p>}

      {!chargement && items.length === 0 && !erreur && (
        <p className="mt-6 font-bold text-cacao">Aucun prix enregistré.</p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {items.map((p) => (
          <div
            key={p.id}
            className={cx(
              "rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-sable/60 px-4 py-3 transition-shadow md:px-6 md:py-4",
              editId === p.id && "ring-2 ring-mangue/60",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-semibold text-foret md:text-lg">
                  {p.ingredient.name}
                </p>
                <p className="mt-0.5 text-sm text-cacao md:text-base">
                  {p.placeType} · {p.city}
                  {p.store && ` · ${p.store.name}`}
                  {" · "}
                  {new Date(p.observedAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-display text-base font-bold text-puce md:text-lg">
                  {fcfa(p.priceFcfa)}
                </span>
                <span className="text-xs text-cacao md:text-sm">/{p.unit.label}</span>
              </div>
            </div>

            {editId === p.id ? (
              <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-sable pt-3">
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-canard md:text-xs">Prix (FCFA)</label>
                  <input
                    type="number"
                    min={1}
                    value={editPrix}
                    onChange={(e) => setEditPrix(e.target.value)}
                    className="mt-0.5 h-9 w-full rounded-lg border-2 border-foret bg-creme px-3 text-sm font-bold text-foret md:h-10 md:px-4 md:text-base"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-canard md:text-xs">Ville</label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    className="mt-0.5 h-9 w-full rounded-lg border-2 border-foret bg-creme px-3 text-sm font-bold text-foret md:h-10 md:px-4 md:text-base"
                  />
                </div>
                <button
                  onClick={() => enregistrer(p)}
                  disabled={saving}
                  className="h-9 rounded-lg bg-palme px-4 text-sm font-bold text-creme disabled:opacity-50 md:h-10 md:text-base"
                >
                  {saving ? "…" : "Enregistrer"}
                </button>
                <button
                  onClick={fermer}
                  className="h-9 rounded-lg border-2 border-cacao px-3 text-sm font-bold text-cacao md:h-10 md:px-4 md:text-base"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => ouvrir(p)}
                  className="rounded-lg border-2 border-palme px-3 py-1 text-sm font-bold text-palme md:px-4 md:py-2 md:text-base"
                >
                  Modifier
                </button>
                <button
                  onClick={() => supprimer(p.id)}
                  className="rounded-lg bg-carmin/10 px-3 py-1 text-sm font-bold text-carmin md:px-4 md:py-2 md:text-base"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
