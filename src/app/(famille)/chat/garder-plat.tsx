"use client";

import { useState } from "react";
import type { IdeeFrigo } from "@/lib/agent/idees-frigo";
import { CATEGORIESPLAT, type CategoriePlat } from "@/lib/validation/plat-foyer";

const estCategorie = (c: string | undefined): c is CategoriePlat =>
  CATEGORIESPLAT.includes(c as CategoriePlat);

/**
 * « Garder ce plat » : la famille valide ou corrige les quantités proposées par le code (règle 3),
 * puis le plat devient une recette de son foyer, visible d'elle seule.
 */
export function GarderPlat({ idee }: { idee: IdeeFrigo }) {
  const lignes = idee.aGarder ?? [];
  const [ouvert, setOuvert] = useState(false);
  const [grammes, setGrammes] = useState<Record<string, string>>(() =>
    Object.fromEntries(lignes.map((l) => [l.ingredientId, String(l.grammes)])),
  );
  const [etat, setEtat] = useState<"saisie" | "envoi" | "garde">("saisie");
  const [erreur, setErreur] = useState<string | null>(null);

  if (lignes.length === 0) return null;
  if (etat === "garde") {
    return <p className="mt-2 font-hand text-lg font-bold text-palme">gardé dans tes plats ✓</p>;
  }
  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="press mt-2.5 min-h-11 rounded-[12px_16px_14px_12px] bg-foret px-4 text-sm font-extrabold text-or"
      >
        Garder ce plat
      </button>
    );
  }

  async function garder() {
    const ingredients = lignes.map((l) => ({
      ingredientId: l.ingredientId,
      grammes: Number(grammes[l.ingredientId]?.replace(",", ".")),
    }));
    if (ingredients.some((i) => !Number.isFinite(i.grammes) || i.grammes <= 0)) {
      setErreur("Indique une quantité en grammes pour chaque ingrédient.");
      return;
    }
    setEtat("envoi");
    setErreur(null);
    try {
      const reponse = await fetch("/api/recipes/foyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: idee.titre,
          ...(estCategorie(idee.categorie) ? { categorie: idee.categorie } : {}),
          personnes: idee.personnes,
          etapes: idee.etapes,
          ingredients,
        }),
      });
      if (!reponse.ok) {
        const corps = await reponse.json().catch(() => null);
        setErreur(corps?.error?.message ?? "Le plat n'a pas pu être gardé. Réessaie.");
        setEtat("saisie");
        return;
      }
      setEtat("garde");
    } catch {
      setErreur("Pas de connexion. Réessaie dans un instant.");
      setEtat("saisie");
    }
  }

  return (
    <div className="mt-2.5 border-t-2 border-dashed border-sable pt-2.5">
      <p className="text-[13px] font-extrabold">
        Quantités pour {idee.personnes} personne{idee.personnes > 1 ? "s" : ""} :
      </p>
      <p className="text-xs font-bold text-cacao">
        Proposées par l&apos;application, corrige-les si besoin.
      </p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {lignes.map((l) => (
          <li key={l.ingredientId} className="flex items-center gap-2 text-[13px] font-semibold">
            <label htmlFor={`g-${l.ingredientId}`} className="flex-1">
              {l.nom}
            </label>
            <input
              id={`g-${l.ingredientId}`}
              inputMode="decimal"
              value={grammes[l.ingredientId] ?? ""}
              onChange={(e) => setGrammes((g) => ({ ...g, [l.ingredientId]: e.target.value }))}
              className="h-11 w-20 rounded-lg border-2 border-foret bg-white px-2 text-right font-bold"
            />
            <span aria-hidden="true">g</span>
          </li>
        ))}
      </ul>
      {erreur && <p className="mt-1.5 text-xs font-bold text-carmin">{erreur}</p>}
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={garder}
          disabled={etat === "envoi"}
          className="press min-h-11 flex-[1.4] rounded-[12px_16px_14px_12px] bg-foret px-3 text-sm font-extrabold text-or disabled:opacity-60"
        >
          {etat === "envoi" ? "Enregistrement…" : "Garder dans mes plats"}
        </button>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          className="min-h-11 flex-1 text-sm font-extrabold text-carmin underline decoration-wavy underline-offset-4"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
