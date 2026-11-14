"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/titre-page";
import { cx } from "@/lib/format";

type Utilisateur = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
};

const ROLE_BADGE: Record<string, string> = {
  admin: "bg-puce/20 text-puce",
  user: "bg-palme/20 text-palme",
  driver: "bg-lagon/20 text-lagon",
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
      <PageHeader overline="Administration" title="Utilisateurs" />

      <p className="mt-1 text-sm text-cacao">
        {chargement ? "Chargement…" : `${items.length} utilisateur${items.length > 1 ? "s" : ""}`}
      </p>

      {erreur && <p className="mt-4 rounded-xl bg-carmin/10 px-4 py-2 font-bold text-carmin">{erreur}</p>}

      {!chargement && items.length === 0 && !erreur && (
        <p className="mt-6 font-bold text-cacao">Aucun utilisateur inscrit.</p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {items.map((u) => (
          <div
            key={u.id}
            className={cx(
              "rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-sable/60 px-4 py-3 md:px-6 md:py-4",
              resetId === u.id && "ring-2 ring-mangue/60",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-display font-semibold text-foret md:text-lg">{u.fullName}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase md:text-xs ${ROLE_BADGE[u.role] ?? "bg-sable text-cacao"}`}
                  >
                    {u.role}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-cacao md:text-base">
                  {u.email} · inscrit le{" "}
                  {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <button
                onClick={() => {
                  setResetId(resetId === u.id ? null : u.id);
                  setMdp("");
                  setResetMsg("");
                }}
                className="shrink-0 rounded-lg border-2 border-cacao px-3 py-1 text-sm font-bold text-cacao md:px-4 md:py-2 md:text-base"
              >
                Réinit. mdp
              </button>
            </div>

            {resetId === u.id && (
              <div className="mt-3 border-t border-sable pt-3">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-canard md:text-xs">Nouveau mot de passe</label>
                    <input
                      type="password"
                      placeholder="Min. 8 caractères"
                      value={mdp}
                      onChange={(e) => setMdp(e.target.value)}
                      className="mt-0.5 h-9 w-full rounded-lg border-2 border-foret bg-creme px-3 text-sm font-bold text-foret md:h-10 md:px-4 md:text-base"
                    />
                  </div>
                  <button
                    onClick={() => resetPassword(u.id)}
                    className="h-9 rounded-lg bg-palme px-4 text-sm font-bold text-creme md:h-10 md:text-base"
                  >
                    Confirmer
                  </button>
                </div>
                {resetMsg && (
                  <p className={cx(
                    "mt-2 rounded-lg px-3 py-1.5 text-xs font-bold",
                    resetMsg.includes("réinitialisé") ? "bg-palme/10 text-palme" : "bg-carmin/10 text-carmin",
                  )}>
                    {resetMsg}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
