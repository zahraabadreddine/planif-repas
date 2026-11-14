"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/titre-page";
import { cx } from "@/lib/format";

type Recette = {
  id: string;
  title: string;
  cuisine: string;
  validated: boolean;
  prepMinutes: number;
  cookMinutes: number;
  difficulty: number;
};

const DIFFICULTE = ["", "Facile", "Moyen", "Difficile"];

export default function AdminRecettesPage() {
  const [recettes, setRecettes] = useState<Recette[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [filtre, setFiltre] = useState<"toutes" | "validees" | "en-attente">("toutes");

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

  const filtrees = recettes.filter((r) => {
    if (filtre === "validees") return r.validated;
    if (filtre === "en-attente") return !r.validated;
    return true;
  });

  const nbValidees = recettes.filter((r) => r.validated).length;
  const nbAttente = recettes.length - nbValidees;

  return (
    <>
      <PageHeader overline="Administration" title="Recettes" />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {(["toutes", "validees", "en-attente"] as const).map((f) => {
          const labels = { toutes: `Toutes (${recettes.length})`, validees: `Validées (${nbValidees})`, "en-attente": `En attente (${nbAttente})` };
          return (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={cx(
                "rounded-full px-3 py-1 text-xs font-bold transition-colors",
                filtre === f
                  ? "bg-foret text-creme"
                  : "border border-sable text-cacao hover:bg-sable/50",
              )}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {chargement && <p className="mt-6 font-bold text-cacao">Chargement…</p>}
      {erreur && <p className="mt-4 rounded-xl bg-carmin/10 px-4 py-2 font-bold text-carmin">{erreur}</p>}

      {!chargement && recettes.length === 0 && !erreur && (
        <p className="mt-6 font-bold text-cacao">Aucune recette dans le catalogue.</p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {filtrees.map((rec) => (
          <div
            key={rec.id}
            className="rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-sable/60 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-display font-semibold text-foret">{rec.title}</p>
                  <span
                    className={cx(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      rec.validated ? "bg-palme/20 text-palme" : "bg-mangue/20 text-sirop",
                    )}
                  >
                    {rec.validated ? "Validée" : "En attente"}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-cacao">
                  {rec.cuisine} · {rec.prepMinutes + rec.cookMinutes} min · {DIFFICULTE[rec.difficulty] || `Niv. ${rec.difficulty}`}
                </p>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => basculerValidation(rec)}
                className={cx(
                  "rounded-lg px-3 py-1 text-sm font-bold",
                  rec.validated
                    ? "border-2 border-cacao text-cacao"
                    : "bg-palme text-creme",
                )}
              >
                {rec.validated ? "Retirer validation" : "Valider"}
              </button>
              <button
                onClick={() => supprimer(rec.id)}
                className="rounded-lg bg-carmin/10 px-3 py-1 text-sm font-bold text-carmin"
              >
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
