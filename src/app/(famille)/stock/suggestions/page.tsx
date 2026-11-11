"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HandNote, Pin } from "@/components/main-levee";
import { ChevronLeft, ClockIcon } from "@/components/icones";
import { cx } from "@/lib/format";

type SuggestionRecette = {
  id: string;
  title: string;
  cuisine: string;
  prepMinutes: number;
  cookMinutes: number;
  servings: number;
  difficulty: number;
  tags: string[];
  utiliseUseSoon: boolean;
  // Seulement pour les recettes faisables pour moins de personnes que le foyer
  personnes?: number;
};

type Reponse = {
  completes: SuggestionRecette[];
  pourMoins: SuggestionRecette[];
  personnesFoyer: number;
};

/** Message déjà écrit pour Umi : il imagine un plat avec seulement ce qu'il reste (rien n'est envoyé seul). */
const LIENUMI = `/chat?message=${encodeURIComponent("Je veux vider mon frigo sans rien acheter.")}`;

const POSTITS = [
  { paper: "bg-or", pin: "bg-tomate", tilt: -2, ink: "text-carmin" },
  { paper: "bg-rose", pin: "bg-palme", tilt: 1.5, ink: "text-puce" },
  { paper: "bg-creme", pin: "bg-mangue", tilt: -1, ink: "text-puce" },
  { paper: "bg-lagon/30", pin: "bg-foret", tilt: 2.5, ink: "text-canard" },
];

function difficulteLabel(d: number): string {
  if (d <= 1) return "Facile";
  if (d === 2) return "Moyen";
  return "Avancé";
}

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<SuggestionRecette[]>([]);
  const [pourMoins, setPourMoins] = useState<SuggestionRecette[]>([]);
  const [personnesFoyer, setPersonnesFoyer] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stock/suggestions")
      .then(async (r) => {
        if (!r.ok) throw new Error("Impossible de charger les suggestions");
        return r.json();
      })
      .then((r: Reponse) => {
        setSuggestions(r.completes);
        setPourMoins(r.pourMoins);
        setPersonnesFoyer(r.personnesFoyer);
      })
      .catch(() => setErreur("Impossible de charger les suggestions."))
      .finally(() => setChargement(false));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 pb-32 pt-6">
      <Link
        href="/stock"
        className="press mb-4 flex items-center gap-1 self-start font-hand text-lg font-bold text-canard"
      >
        <ChevronLeft size={18} />
        Retour au stock
      </Link>

      <HandNote tilt={-3} className="mb-1 text-2xl text-carmin">
        Vider le frigo
      </HandNote>
      <p className="mb-6 text-center font-hand text-lg font-bold text-puce">
        Qu&apos;est-ce qu&apos;on peut cuisiner avec ce qu&apos;il reste ?
      </p>

      {chargement && (
        <p className="mt-8 animate-pulse text-center font-hand text-xl font-bold text-canard">
          On fouille dans le frigo…
        </p>
      )}

      {erreur && (
        <p className="mt-8 text-center font-hand text-xl font-bold text-carmin">{erreur}</p>
      )}

      {!chargement && !erreur && suggestions.length === 0 && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-center font-hand text-xl font-bold text-canard">
            {pourMoins.length > 0
              ? `Pas de recette complète pour ${personnesFoyer} avec ce qu'il reste.`
              : "Pas de recette complète avec ce qu'il reste : surtout de petites quantités."}
          </p>
          <p className="text-center text-sm font-bold text-cacao">
            Umi peut imaginer un plat avec seulement ce que tu as.
          </p>
          <Link
            href={LIENUMI}
            className="press wonky flex min-h-11 items-center border-[2.5px] border-foret bg-or px-4 py-2 font-display text-base font-bold text-puce shadow-[0_3px_0_#13260F]"
          >
            Demander une idée à Umi
          </Link>
          <Link
            href="/stock"
            className="flex min-h-11 items-center text-sm font-extrabold text-carmin underline decoration-wavy underline-offset-4"
          >
            Ajouter des courses
          </Link>
        </div>
      )}

      {!chargement && !erreur && pourMoins.length > 0 && (
        <section className="mt-6 w-full">
          <h2 className="mb-3 font-hand text-xl font-bold text-puce">Pour moins de personnes</h2>
          <ul className="flex flex-col gap-2">
            {pourMoins.map((recette) => (
              <li
                key={recette.id}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md border-2 border-foret/30 bg-creme px-3 py-2"
              >
                <span className="font-display text-base font-bold text-puce">{recette.title}</span>
                <span className="whitespace-nowrap font-hand text-base font-bold text-carmin">
                  pour {recette.personnes} pers.
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!chargement && !erreur && suggestions.length > 0 && (
        <section className="flex w-full flex-col gap-5">
          {suggestions.map((recette, i) => {
            const style = POSTITS[i % POSTITS.length];
            const totalMinutes = recette.prepMinutes + recette.cookMinutes;

            return (
              <article
                key={recette.id}
                className={cx(
                  "paper-shadow wonky relative rounded-sm border-[2.5px] border-foret p-4",
                  style.paper,
                )}
                style={{ transform: `rotate(${style.tilt}deg)` }}
              >
                <Pin color={style.pin} />

                {recette.utiliseUseSoon && (
                  <span className="absolute -right-2 -top-3 rotate-6 rounded-full border-2 border-foret bg-sirop px-2 py-0.5 font-hand text-sm font-bold text-puce">
                    À utiliser vite !
                  </span>
                )}

                <h2 className={cx("font-display text-lg font-bold leading-tight", style.ink)}>
                  {recette.title}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-hand text-base font-bold text-cacao">
                  <span className="flex items-center gap-1">
                    <ClockIcon size={16} />
                    {totalMinutes} min
                  </span>
                  <span>{recette.cuisine}</span>
                  <span>{difficulteLabel(recette.difficulty)}</span>
                  <span>{recette.servings} parts</span>
                </div>

                {recette.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {recette.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-foret/40 bg-creme px-2 py-0.5 font-hand text-sm font-bold text-puce"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
