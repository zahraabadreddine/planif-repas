"use client";

import { useState } from "react";
import type { ProfilFoyer as Profil } from "@/lib/foyer/profil";
import { fcfa } from "@/lib/format";
import { CUISINES, JOURS } from "@/lib/validation/foyer";
import { FormulaireFoyer } from "./formulaire-foyer";

const cadre =
  "paper-shadow mt-6 rounded-[20px_16px_22px_18px] border-[2.5px] border-foret bg-creme p-5";

function libellesCuisines(foyer: Profil) {
  const libelles = CUISINES.filter((c) => foyer.cuisinesPreferred.includes(c.valeur)).map(
    (c) => c.libelle,
  );
  return libelles.length > 0 ? libelles.join(", ") : "Pas de préférence";
}

function libelleJour(foyer: Profil) {
  return JOURS.find((jour) => jour.valeur === foyer.shoppingDay)?.libelle ?? "Pas de jour fixe";
}

/** Profil du foyer : formulaire s'il n'existe pas encore, sinon résumé avec « Modifier » (EF-03). */
export function ProfilFoyer({ foyer: foyerInitial }: { foyer: Profil | null }) {
  // Le foyer enregistré s'affiche aussitôt, sans attendre le rechargement de la page.
  const [foyer, setFoyer] = useState(foyerInitial);
  const [edition, setEdition] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!foyer || edition) {
    return (
      <section className={cadre}>
        <h2 className="font-display text-xl font-semibold text-foret">
          {foyer ? "Modifier mon foyer" : "Décris ton foyer"}
        </h2>
        {!foyer && (
          <p className="mt-1 text-sm font-semibold text-cacao">
            Quelques infos suffisent pour préparer ton premier menu.
          </p>
        )}
        <FormulaireFoyer
          foyer={foyer}
          onAnnuler={foyer ? () => setEdition(false) : undefined}
          onEnregistre={(enregistre) => {
            setFoyer(enregistre);
            setEdition(false);
            setMessage(foyer ? "Ton foyer a bien été modifié." : "Ton foyer est créé !");
          }}
        />
      </section>
    );
  }

  return (
    <section className={cadre}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-foret">{foyer.name}</h2>
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setEdition(true);
          }}
          className="press -mr-1 -mt-1 h-11 shrink-0 rounded-[14px_18px_16px_12px] border-[2.5px] border-foret px-4 text-sm font-extrabold text-foret"
        >
          Modifier
        </button>
      </div>
      <dl className="mt-3 flex flex-col gap-2.5 text-[15px]">
        <div>
          <dt className="text-sm font-bold text-cacao">Budget de la semaine</dt>
          <dd className="font-extrabold text-foret">{fcfa(foyer.weeklyBudgetFcfa)}</dd>
        </div>
        <div>
          <dt className="text-sm font-bold text-cacao">Cuisines préférées</dt>
          <dd className="font-extrabold text-foret">{libellesCuisines(foyer)}</dd>
        </div>
        <div>
          <dt className="text-sm font-bold text-cacao">Jour des courses</dt>
          <dd className="font-extrabold text-foret">{libelleJour(foyer)}</dd>
        </div>
      </dl>
      {message && (
        <p role="status" className="mt-3 text-sm font-bold text-palme">
          {message}
        </p>
      )}
    </section>
  );
}
