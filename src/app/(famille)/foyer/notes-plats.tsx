"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageErreur } from "@/components/champ-formulaire";
import type { PlatANoter } from "@/lib/foyer/notes";
import { cx } from "@/lib/format";
import { NOTES, TAILLESERIE, type Note } from "@/lib/validation/note";
import { NoterPlats, envoyerNote } from "./noter-plats";

const cadre =
  "paper-shadow mt-6 rounded-[20px_16px_22px_18px] border-[2.5px] border-foret bg-creme p-5";
const boutonPrincipal =
  "press flex h-[58px] w-full items-center justify-center rounded-[18px_22px_20px_16px] bg-foret font-display text-xl font-semibold text-or shadow-[0_6px_0_#411102]";

const CHOIX: { valeur: Note | null; court: string }[] = [
  { valeur: 3, court: "J'aime" },
  { valeur: 2, court: "Bof" },
  { valeur: 1, court: "Non" },
  { valeur: null, court: "Pas goûté" },
];

type Props = { plats: PlatANoter[]; aUnFoyer: boolean };

/** Section « Vos plats » de la page foyer : résumé des notes et notation (EF-04). */
export function NotesPlats({ plats: platsInitiaux, aUnFoyer }: Props) {
  const router = useRouter();
  const [plats, setPlats] = useState(platsInitiaux);
  const [notation, setNotation] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const notes = plats.filter((p) => p.rating !== null);
  const aDecouvrir = plats.filter((p) => p.rating === null);

  function noter(recipeId: string, rating: Note | null) {
    setPlats((liste) => liste.map((p) => (p.id === recipeId ? { ...p, rating } : p)));
  }

  async function changer(plat: PlatANoter, rating: Note | null) {
    setErreur(null);
    if (rating !== plat.rating) {
      const message = await envoyerNote(plat.id, rating);
      if (message) {
        setErreur(message);
        return;
      }
      noter(plat.id, rating);
      router.refresh();
    }
    setOuvert(null);
  }

  function finNotation() {
    setNotation(false);
    router.refresh();
  }

  return (
    <section id="plats" className={cadre}>
      <h2 className="font-display text-xl font-semibold text-foret">
        Vos plats{notes.length > 0 && ` (${notes.length} notés)`}
      </h2>

      {!aUnFoyer ? (
        <p className="mt-2 text-sm font-semibold text-cacao">
          Décris d&apos;abord ton foyer, puis note les plats que vous aimez.
        </p>
      ) : notation ? (
        <NoterPlats plats={aDecouvrir} onNote={noter} onFin={finNotation} />
      ) : (
        <>
          {notes.length === 0 ? (
            <p className="mt-2 text-sm font-semibold text-cacao">
              Note quelques plats que vous aimez ou pas : Umami s&apos;en servira pour vous proposer
              des menus à votre goût.
            </p>
          ) : (
            NOTES.map((groupe) => {
              const dansLeGroupe = notes.filter((p) => p.rating === groupe.valeur);
              if (dansLeGroupe.length === 0) return null;
              return (
                <div key={groupe.valeur} className="mt-3">
                  <h3 className="text-sm font-extrabold text-foret">{groupe.libelle}</h3>
                  <ul className="mt-1 flex flex-col gap-1.5">
                    {dansLeGroupe.map((plat) => (
                      <li key={plat.id}>
                        <button
                          type="button"
                          aria-expanded={ouvert === plat.id}
                          onClick={() => setOuvert(ouvert === plat.id ? null : plat.id)}
                          className="press flex min-h-11 w-full items-center justify-between rounded-[14px_18px_16px_12px] bg-sable/60 px-3.5 text-left text-[15px] font-bold text-foret"
                        >
                          {plat.title}
                          <span className="text-sm text-cacao">changer</span>
                        </button>
                        {ouvert === plat.id && (
                          <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                            {CHOIX.map((choix) => (
                              <button
                                key={choix.court}
                                type="button"
                                onClick={() => changer(plat, choix.valeur)}
                                aria-pressed={plat.rating === choix.valeur}
                                className={cx(
                                  "press min-h-11 rounded-full border-[2.5px] border-foret px-1 text-[13px] font-bold",
                                  plat.rating === choix.valeur
                                    ? "bg-palme text-creme"
                                    : "bg-creme text-foret",
                                )}
                              >
                                {choix.court}
                              </button>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}

          {erreur && (
            <div className="mt-3">
              <MessageErreur>{erreur}</MessageErreur>
            </div>
          )}

          {aDecouvrir.length > 0 && (
            <button
              type="button"
              onClick={() => setNotation(true)}
              className={`${boutonPrincipal} mt-4`}
            >
              {notes.length === 0
                ? `Noter ${Math.min(TAILLESERIE, aDecouvrir.length)} plats`
                : `Continuer (${aDecouvrir.length} à découvrir)`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
