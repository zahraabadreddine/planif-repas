"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/titre-page";

type Recette = {
  id: string;
  title: string;
  cuisine: string;
  validated: boolean;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: number;
};

export default function AdminRecettesPage() {
  const [recettes, setRecettes] = useState<Recette[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    fetch("/api/admin/recipes")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setRecettes(d.recipes))
      .catch(() => setErreur("Impossible de charger les recettes."))
      .finally(() => setChargement(false));
  }, []);

  async function supprimer(id: string) {
    if (!confirm("Supprimer cette recette ?")) return;
    const r = await fetch(`/api/admin/recipes/${id}`, { method: "DELETE" });
    if (r.ok) setRecettes((prev) => prev.filter((rec) => rec.id !== id));
  }

  async function basculerValidation(rec: Recette) {
    const r = await fetch(`/api/admin/recipes/${rec.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ validated: !rec.validated }),
    });
    if (r.ok) {
      const d = await r.json();
      setRecettes((prev) => prev.map((x) => (x.id === d.recipe.id ? d.recipe : x)));
    }
  }

  return (
    <>
      <PageHeader
        overline="Administration"
        title="Recettes"
        right={
          <Link
            href="/admin"
            className="text-sm font-bold text-palme underline"
          >
            Retour
          </Link>
        }
      />

      {chargement && <p className="mt-6 font-bold text-cacao">Chargement…</p>}
      {erreur && <p className="mt-6 font-bold text-carmin">{erreur}</p>}

      {!chargement && recettes.length === 0 && !erreur && (
        <p className="mt-6 font-bold text-cacao">Aucune recette dans le catalogue.</p>
      )}

      <div className="mt-4 space-y-3">
        {recettes.map((rec) => (
          <div
            key={rec.id}
            className="flex items-center justify-between gap-3 rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-sable/60 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-display font-semibold text-foret">{rec.title}</p>
              <p className="text-sm text-cacao">
                {rec.cuisine} · {rec.prepMinutes + rec.cookMinutes} min · difficulté {rec.difficulty}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => basculerValidation(rec)}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                  rec.validated
                    ? "bg-palme text-creme"
                    : "border-2 border-cacao text-cacao"
                }`}
              >
                {rec.validated ? "Validée" : "Valider"}
              </button>
              <button
                onClick={() => supprimer(rec.id)}
                className="rounded-lg bg-carmin px-3 py-1.5 text-sm font-bold text-creme"
              >
                Suppr.
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
