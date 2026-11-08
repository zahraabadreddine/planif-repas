"use client";

import { useEffect, useReducer, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/titre-page";
import { HandNote, Tape } from "@/components/main-levee";
import { ChevronLeft } from "@/components/icones";
import { cx } from "@/lib/format";

type Preference = {
  id: string;
  key: string;
  value: string;
  confidence: number;
  explanation: string;
  source: string;
  active: boolean;
  updatedAt: string;
};

type Etat = "chargement" | "ok" | "erreur" | "vide";

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<Preference[]>([]);
  const [etat, setEtat] = useState<Etat>("chargement");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [recharger, forceRecharger] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    let annule = false;
    async function chargerDonnees() {
      try {
        const res = await fetch("/api/preferences");
        if (annule) return;
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message ?? `Erreur ${res.status}`);
        }
        const data: Preference[] = await res.json();
        if (annule) return;
        setPrefs(data);
        setEtat(data.length === 0 ? "vide" : "ok");
      } catch (err) {
        if (annule) return;
        setErreur(err instanceof Error ? err.message : "Impossible de charger les préférences.");
        setEtat("erreur");
      }
    }
    chargerDonnees();
    return () => { annule = true; };
  }, [recharger]);

  async function basculerActif(id: string, actif: boolean) {
    setEnCours(id);
    try {
      const res = await fetch("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, active: actif }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Erreur ${res.status}`);
      }
      const mise: Preference = await res.json();
      setPrefs((prev) => prev.map((p) => (p.id === id ? mise : p)));
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la modification.");
    } finally {
      setEnCours(null);
    }
  }

  async function supprimer(id: string) {
    setEnCours(id);
    try {
      const res = await fetch(`/api/preferences?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? `Erreur ${res.status}`);
      }
      setPrefs((prev) => {
        const next = prev.filter((p) => p.id !== id);
        if (next.length === 0) setEtat("vide");
        return next;
      });
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    } finally {
      setEnCours(null);
    }
  }

  return (
    <>
      <div className="mb-1 flex items-center gap-2">
        <Link
          href="/foyer"
          aria-label="Retour au foyer"
          className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center"
        >
          <ChevronLeft size={20} strokeWidth={2.8} />
        </Link>
        <div className="flex-1">
          <PageHeader overline="Agent IA" title="Ce qu'Umi a retenu" />
        </div>
      </div>

      <p className="mb-4 text-sm font-bold text-cacao">
        Umi apprend tes goûts au fil des conversations. Tu peux désactiver ou supprimer ce qui ne te
        convient plus.
      </p>

      {erreur && (
        <p className="mb-3 rounded-lg bg-carmin/10 px-3 py-2 text-center text-[13px] font-bold text-carmin">
          {erreur}
        </p>
      )}

      {etat === "chargement" && (
        <div className="flex flex-col items-center gap-3 py-12">
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-palme border-t-transparent" />
          <HandNote className="text-lg text-cacao" tilt={-2}>
            Chargement…
          </HandNote>
        </div>
      )}

      {etat === "vide" && (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <HandNote className="text-2xl text-cacao" tilt={-2}>
            Rien pour l&apos;instant
          </HandNote>
          <p className="max-w-[260px] text-sm font-bold text-cacao/80">
            Discute avec Umi dans le chat, elle retiendra tes préférences au fil du temps.
          </p>
          <Link
            href="/chat"
            className="press mt-2 h-11 rounded-[14px_18px_16px_12px] bg-palme px-5 text-[15px] font-extrabold leading-[44px] text-creme"
          >
            Parler à Umi
          </Link>
        </div>
      )}

      {etat === "erreur" && !erreur && (
        <div className="flex flex-col items-center gap-3 py-12">
          <HandNote className="text-xl text-carmin" tilt={-1}>
            Impossible de charger
          </HandNote>
          <button
            type="button"
            onClick={forceRecharger}
            className="press h-11 rounded-[14px_18px_16px_12px] bg-palme px-5 text-[15px] font-extrabold text-creme"
          >
            Réessayer
          </button>
        </div>
      )}

      {etat === "ok" && (
        <ul className="flex flex-col gap-3">
          {prefs.map((p) => (
            <li key={p.id}>
              <PreferenceCard
                pref={p}
                loading={enCours === p.id}
                onToggle={() => basculerActif(p.id, !p.active)}
                onDelete={() => supprimer(p.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function PreferenceCard({
  pref,
  loading,
  onToggle,
  onDelete,
}: {
  pref: Preference;
  loading: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const confiance = Math.round(pref.confidence * 100);

  return (
    <div
      className={cx(
        "paper-shadow relative -rotate-[0.5deg] rounded-md bg-white px-4 pb-3 pt-4",
        !pref.active && "opacity-60",
      )}
    >
      <Tape color="bg-or" className="-top-2.5 left-6 rotate-2" />

      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="font-hand text-lg font-bold leading-tight text-carmin">{pref.key}</p>
        <span
          className={cx(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-extrabold",
            pref.source === "user" ? "bg-palme/20 text-palme" : "bg-mangue/40 text-foret",
          )}
        >
          {pref.source === "user" ? "Toi" : "Umi"}
        </span>
      </div>

      <p className="text-[15px] font-semibold leading-snug">{pref.value}</p>

      <p className="mt-1 text-[13px] font-bold text-cacao/80">{pref.explanation}</p>

      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sable">
          <div
            className="h-full rounded-full bg-palme transition-all"
            style={{ width: `${confiance}%` }}
          />
        </div>
        <span className="text-[11px] font-extrabold text-cacao">{confiance} %</span>
      </div>

      <div className="mt-3 flex gap-2 border-t-2 border-dashed border-sable pt-2.5">
        <button
          type="button"
          onClick={onToggle}
          disabled={loading}
          className={cx(
            "press h-11 flex-1 rounded-[12px_16px_14px_12px] text-[14px] font-extrabold",
            pref.active
              ? "bg-sable text-foret"
              : "bg-palme text-creme",
          )}
        >
          {pref.active ? "Désactiver" : "Réactiver"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={loading}
          className="h-11 flex-1 text-[14px] font-extrabold text-carmin underline decoration-wavy underline-offset-4"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}
