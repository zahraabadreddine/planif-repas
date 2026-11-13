"use client";

import { useEffect, useState } from "react";
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
  const [recherche, setRecherche] = useState("");

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

  const filtres = items.filter(
    (i) =>
      i.name.toLowerCase().includes(recherche.toLowerCase()) ||
      i.category.toLowerCase().includes(recherche.toLowerCase()),
  );

  const categories = [...new Set(items.map((i) => i.category))].sort();

  return (
    <>
      <PageHeader overline="Administration" title="Ingrédients" />

      <p className="mt-1 text-sm text-cacao">
        {chargement ? "Chargement…" : `${items.length} ingrédient${items.length > 1 ? "s" : ""} · ${categories.length} catégorie${categories.length > 1 ? "s" : ""}`}
      </p>

      <input
        type="text"
        placeholder="Rechercher un ingrédient…"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        className="mt-3 h-10 w-full rounded-xl border-2 border-foret bg-creme px-4 text-sm font-bold text-foret placeholder:text-cacao/50"
      />

      {erreur && <p className="mt-4 rounded-xl bg-carmin/10 px-4 py-2 font-bold text-carmin">{erreur}</p>}

      {!chargement && items.length === 0 && !erreur && (
        <p className="mt-6 font-bold text-cacao">Aucun ingrédient dans le catalogue.</p>
      )}

      <div className="mt-4 space-y-3">
        {filtres.map((ing) => (
          <div
            key={ing.id}
            className="flex items-center justify-between gap-3 rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-sable/60 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-display font-semibold text-foret">{ing.name}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-cacao">
                <span className="rounded-full bg-biscuit/40 px-2 py-0.5 text-xs font-bold text-sirop">
                  {ing.category}
                </span>
                {ing.allergens.map((a) => (
                  <span
                    key={a}
                    className="rounded-full bg-carmin/10 px-2 py-0.5 text-[10px] font-bold text-carmin"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => supprimer(ing.id)}
              className="shrink-0 rounded-lg bg-carmin/10 px-3 py-1 text-sm font-bold text-carmin"
            >
              Supprimer
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
