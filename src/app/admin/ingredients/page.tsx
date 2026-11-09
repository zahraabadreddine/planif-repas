"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/titre-page";

type Ingredient = {
  id: string;
  name: string;
  category: string;
  allergens: string[];
};

export default function AdminIngredientsPage() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    fetch("/api/admin/ingredients")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setItems(d.ingredients))
      .catch(() => setErreur("Impossible de charger les ingrédients."))
      .finally(() => setChargement(false));
  }, []);

  async function supprimer(id: string) {
    if (!confirm("Supprimer cet ingrédient ?")) return;
    const r = await fetch(`/api/admin/ingredients/${id}`, { method: "DELETE" });
    if (r.ok) setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <>
      <PageHeader
        overline="Administration"
        title="Ingrédients"
        right={
          <Link href="/admin" className="text-sm font-bold text-palme underline">
            Retour
          </Link>
        }
      />

      {chargement && <p className="mt-6 font-bold text-cacao">Chargement…</p>}
      {erreur && <p className="mt-6 font-bold text-carmin">{erreur}</p>}

      {!chargement && items.length === 0 && !erreur && (
        <p className="mt-6 font-bold text-cacao">Aucun ingrédient dans le catalogue.</p>
      )}

      <div className="mt-4 space-y-3">
        {items.map((ing) => (
          <div
            key={ing.id}
            className="flex items-center justify-between gap-3 rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-sable/60 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-display font-semibold text-foret">{ing.name}</p>
              <p className="text-sm text-cacao">
                {ing.category}
                {ing.allergens.length > 0 && ` · Allergènes : ${ing.allergens.join(", ")}`}
              </p>
            </div>
            <button
              onClick={() => supprimer(ing.id)}
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
