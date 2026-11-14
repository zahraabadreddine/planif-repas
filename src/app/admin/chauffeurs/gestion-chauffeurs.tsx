"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, UserIcon, CheckIcon, CloseIcon } from "@/components/icones";

type Chauffeur = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  commune: string;
  vehicle: string;
  status: string;
  activeOrders: number;
};

const STATUS_LABEL: Record<string, string> = {
  available: "Disponible",
  busy: "Occupé",
  offline: "Hors ligne",
};

const STATUS_STYLE: Record<string, string> = {
  available: "bg-palme/20 text-palme",
  busy: "bg-mangue/30 text-sirop",
  offline: "bg-sable text-cacao",
};

export function GestionChauffeurs({ chauffeurs }: { chauffeurs: Chauffeur[] }) {
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [enChargement, setEnChargement] = useState(false);
  const [erreurForm, setErreurForm] = useState<string | null>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function creer(form: FormData) {
    setEnChargement(true);
    setErreurForm(null);
    try {
      const res = await fetch("/api/admin/drivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email"),
          password: form.get("password"),
          phone: form.get("phone"),
          commune: form.get("commune"),
          vehicle: form.get("vehicle") || "moto",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setErreurForm(data?.error?.message ?? "Impossible de créer le chauffeur.");
        return;
      }
      setShowForm(false);
      startTransition(() => router.refresh());
    } catch {
      setErreurForm("Erreur réseau. Réessaie.");
    } finally {
      setEnChargement(false);
    }
  }

  async function supprimer(id: string) {
    setEnChargement(true);
    try {
      const res = await fetch(`/api/admin/drivers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSelected(null);
      startTransition(() => router.refresh());
    } finally {
      setEnChargement(false);
    }
  }


  return (
    <div className="mt-4">
      {/* Add button */}
      <button
        onClick={() => setShowForm(!showForm)}
        className="press flex w-full items-center justify-center gap-2 rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-palme/20 px-4 py-3 font-display text-sm font-bold text-foret shadow-[0_3px_0_#411102] transition-transform md:py-4 md:text-base"
      >
        <PlusIcon size={16} />
        Ajouter un chauffeur
      </button>

      {/* Creation form */}
      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            creer(new FormData(e.currentTarget));
          }}
          className="mt-3 rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-[#FFFDF7] px-4 py-4 md:px-6 md:py-5"
        >
          <h3 className="font-display text-sm font-bold text-puce md:text-base">Nouveau chauffeur</h3>
          <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-3.5">
            <Input name="fullName" label="Nom complet" required />
            <Input name="email" label="Email" type="email" required />
            <Input name="password" label="Mot de passe" type="password" required />
            <Input name="phone" label="Téléphone" required />
            <Input name="commune" label="Commune / zone" required />
            <Input name="vehicle" label="Véhicule" placeholder="moto" />
          </div>
          {erreurForm && (
            <p className="mt-2 rounded-lg bg-carmin/10 px-3 py-2 text-xs font-bold text-carmin">
              {erreurForm}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={enChargement}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px_14px_12px_8px] bg-palme px-3 py-2.5 text-sm font-bold text-creme disabled:opacity-50"
            >
              <CheckIcon size={14} />
              {enChargement ? "…" : "Créer"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex items-center justify-center gap-1 rounded-[10px_14px_12px_8px] bg-carmin/10 px-3 py-2.5 text-sm font-bold text-carmin"
            >
              <CloseIcon size={14} />
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Driver list */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2 md:gap-4">
        {chauffeurs.length === 0 && (
          <p className="py-8 text-center text-sm text-cacao">Aucun chauffeur enregistré.</p>
        )}
        {chauffeurs.map((d) => (
          <div key={d.id} className="paper-shadow bg-[#FFFDF7] px-4 py-3 md:px-6 md:py-4">
            <button
              onClick={() => setSelected(selected === d.id ? null : d.id)}
              className="flex w-full items-start justify-between gap-2 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <UserIcon size={15} />
                  <span className="truncate font-display text-[15px] font-bold text-foret md:text-lg">
                    {d.fullName}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-canard md:text-sm">
                  {d.commune} · {d.vehicle} · {d.phone}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold md:text-xs ${STATUS_STYLE[d.status] ?? ""}`}>
                  {STATUS_LABEL[d.status] ?? d.status}
                </span>
                {d.activeOrders > 0 && (
                  <span className="text-[10px] font-bold text-sirop">
                    {d.activeOrders} commande{d.activeOrders > 1 ? "s" : ""} active{d.activeOrders > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </button>

            {selected === d.id && (
              <div className="mt-3 border-t border-sable pt-3">
                <p className="text-xs text-cacao">{d.email}</p>

                <p className="mt-2 text-[11px] text-cacao">
                  Le chauffeur gère lui-même son statut depuis son application.
                </p>

                <button
                  disabled={enChargement}
                  onClick={() => supprimer(d.id)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[10px_14px_12px_8px] bg-carmin/10 px-3 py-2 text-xs font-bold text-carmin disabled:opacity-50"
                >
                  <CloseIcon size={12} />
                  Supprimer ce chauffeur
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Input({
  name,
  label,
  type = "text",
  required,
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-bold text-cacao md:text-sm">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="rounded-[8px_12px_10px_6px] border-2 border-sable bg-creme px-3 py-2 text-sm text-foret outline-none transition-colors focus:border-foret md:px-4 md:py-2.5 md:text-base"
      />
    </label>
  );
}
