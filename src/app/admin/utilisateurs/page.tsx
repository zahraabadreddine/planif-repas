"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/titre-page";

type Utilisateur = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
};

export default function AdminUtilisateursPage() {
  const [items, setItems] = useState<Utilisateur[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [resetId, setResetId] = useState<string | null>(null);
  const [mdp, setMdp] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setItems(d.users))
      .catch(() => setErreur("Impossible de charger les utilisateurs."))
      .finally(() => setChargement(false));
  }, []);

  async function resetPassword(id: string) {
    if (mdp.length < 8) {
      setResetMsg("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    const r = await fetch(`/api/admin/users/${id}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword: mdp }),
    });
    if (r.ok) {
      setResetMsg("Mot de passe réinitialisé.");
      setMdp("");
      setTimeout(() => {
        setResetId(null);
        setResetMsg("");
      }, 2000);
    } else {
      setResetMsg("Erreur lors de la réinitialisation.");
    }
  }

  return (
    <>
      <PageHeader
        overline="Administration"
        title="Utilisateurs"
        right={
          <Link href="/admin" className="text-sm font-bold text-palme underline">
            Retour
          </Link>
        }
      />

      {chargement && <p className="mt-6 font-bold text-cacao">Chargement…</p>}
      {erreur && <p className="mt-6 font-bold text-carmin">{erreur}</p>}

      {!chargement && items.length === 0 && !erreur && (
        <p className="mt-6 font-bold text-cacao">Aucun utilisateur inscrit.</p>
      )}

      <div className="mt-4 space-y-3">
        {items.map((u) => (
          <div
            key={u.id}
            className="rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-sable/60 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-display font-semibold text-foret">{u.fullName}</p>
                <p className="text-sm text-cacao">
                  {u.email} · {u.role} · inscrit le{" "}
                  {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <button
                onClick={() => {
                  setResetId(resetId === u.id ? null : u.id);
                  setMdp("");
                  setResetMsg("");
                }}
                className="shrink-0 rounded-lg border-2 border-cacao px-3 py-1.5 text-sm font-bold text-cacao"
              >
                Réinit. mdp
              </button>
            </div>

            {resetId === u.id && (
              <div className="mt-3 flex items-end gap-2">
                <input
                  type="password"
                  placeholder="Nouveau mot de passe"
                  value={mdp}
                  onChange={(e) => setMdp(e.target.value)}
                  className="h-10 flex-1 rounded-lg border-2 border-foret bg-creme px-3 text-sm font-bold text-foret"
                />
                <button
                  onClick={() => resetPassword(u.id)}
                  className="h-10 rounded-lg bg-palme px-4 text-sm font-bold text-creme"
                >
                  Confirmer
                </button>
                {resetMsg && <span className="text-sm font-bold text-cacao">{resetMsg}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
