"use client";

import Link from "next/link";
import { useState } from "react";
import { Tape } from "@/components/main-levee";
import { fcfa } from "@/lib/format";
import type { MenuFete } from "@/lib/planificateur/fete";

const CRENEAU: Record<MenuFete["creneau"], string> = { lunch: "midi", dinner: "soir" };
const TITRES: Record<string, string> = {
  entrée: "Entrées",
  plat: "Plats",
  accompagnement: "Accompagnements",
  dessert: "Desserts",
};

/**
 * Menu de fête proposé par Umi : plats, coût et budget calculés par le code.
 * La famille le met dans sa semaine en appuyant (règle 1) ; le code revérifie tout.
 */
export function CarteFete({ fete }: { fete: MenuFete }) {
  const [etat, setEtat] = useState<"attente" | "envoi" | "fait">("attente");
  const [erreur, setErreur] = useState<string | null>(null);
  const jour = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${fete.date}T00:00:00Z`));
  const categories = [...new Set(fete.plats.map((p) => p.categorie))];

  async function mettreAuMenu() {
    setEtat("envoi");
    setErreur(null);
    try {
      const reponse = await fetch("/api/meal-plans/fete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: fete.date,
          creneau: fete.creneau,
          personnes: fete.personnes,
          budgetFcfa: fete.budgetFcfa,
          plats: fete.plats.map((p) => ({ recetteId: p.recetteId, categorie: p.categorie })),
        }),
      });
      if (!reponse.ok) {
        const corps = await reponse.json().catch(() => null);
        setErreur(corps?.error?.message ?? "Le menu n'a pas pu être enregistré. Réessaie.");
        setEtat("attente");
        return;
      }
      setEtat("fait");
    } catch {
      setErreur("Pas de connexion. Réessaie dans un instant.");
      setEtat("attente");
    }
  }

  return (
    <div className="paper-shadow relative mt-2 w-[296px] max-w-full -rotate-1 animate-slide-up self-start rounded-md bg-white px-3.5 pb-3 pt-3.5">
      <Tape color="bg-rose" className="-top-3 left-[110px] rotate-3" />
      <p className="font-hand text-lg font-bold leading-none text-carmin">Menu de fête</p>
      <p className="mt-0.5 font-display text-lg font-semibold leading-tight">
        {jour} {CRENEAU[fete.creneau]} · {fete.personnes} personnes
      </p>
      {categories.map((categorie) => (
        <div key={categorie} className="mt-2">
          <p className="text-[13px] font-extrabold">{TITRES[categorie] ?? categorie}</p>
          <ul className="text-[13px] font-semibold">
            {fete.plats
              .filter((p) => p.categorie === categorie)
              .map((p) => (
                <li key={p.recetteId} className="flex justify-between gap-2">
                  <span>{p.titre}</span>
                  <span className="whitespace-nowrap text-cacao">{fcfa(p.coutFcfa, false)} F</span>
                </li>
              ))}
          </ul>
        </div>
      ))}
      <p className="mt-2.5 border-t-2 border-dashed border-sable pt-2 text-sm font-extrabold">
        Total : {fcfa(fete.totalFcfa)} pour un budget de {fcfa(fete.budgetFcfa)}
      </p>
      <p
        className={
          fete.depassementFcfa > 0
            ? "text-[13px] font-bold text-carmin"
            : "text-[13px] font-bold text-palme"
        }
      >
        {fete.depassementFcfa > 0
          ? `Dépasse le budget de ${fcfa(fete.depassementFcfa)}`
          : "Dans le budget"}
      </p>
      {fete.sansPrix.length > 0 && (
        <p className="text-xs font-bold italic text-cacao">
          Prix inconnu, non compté : {fete.sansPrix.join(", ")}
        </p>
      )}
      {etat === "fait" ? (
        <p className="mt-2 font-hand text-lg font-bold text-palme">
          dans ton menu ✓{" "}
          <Link href="/menu" className="underline">
            voir le menu
          </Link>
        </p>
      ) : (
        fete.depassementFcfa === 0 && (
          <button
            type="button"
            onClick={mettreAuMenu}
            disabled={etat === "envoi"}
            className="press mt-2.5 min-h-11 w-full rounded-[12px_16px_14px_12px] bg-foret px-3 text-sm font-extrabold text-or disabled:opacity-60"
          >
            {etat === "envoi"
              ? "Enregistrement…"
              : `Mettre dans le menu de ${jour} ${CRENEAU[fete.creneau]}`}
          </button>
        )
      )}
      {erreur && <p className="mt-1.5 text-xs font-bold text-carmin">{erreur}</p>}
    </div>
  );
}
