"use client";

import { useState } from "react";
import { MessageErreur } from "@/components/champ-formulaire";
import type { PlatANoter } from "@/lib/foyer/notes";
import { NOTES, TAILLESERIE, type Note } from "@/lib/validation/note";

const bouton =
  "press flex min-h-[52px] w-full items-center justify-center rounded-[18px_22px_20px_16px] font-display text-lg font-semibold disabled:opacity-60";

/** Enregistre une note ; null retire la note. Renvoie un message d'erreur, ou null si tout va bien. */
export async function envoyerNote(recipeId: string, rating: Note | null): Promise<string | null> {
  try {
    const reponse = await fetch("/api/household/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId, rating }),
    });
    if (reponse.ok) return null;
    const corps = (await reponse.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    return corps?.error?.message ?? "La note n'a pas pu être enregistrée. Réessaie plus tard.";
  } catch {
    return "Pas de connexion internet. Réessaie dans un instant.";
  }
}

type Props = {
  plats: PlatANoter[];
  onNote: (recipeId: string, rating: Note | null) => void;
  onFin: () => void;
};

/**
 * Notation des plats un par un, par séries de 10 : quatre gros boutons, « Plus tard » pour
 * s'arrêter, et « Noter d'autres plats » à la fin de chaque série (EF-04).
 */
export function NoterPlats({ plats: platsDuDebut, onNote, onFin }: Props) {
  // Copie figée au démarrage : la liste du parent change à chaque note donnée.
  const [plats] = useState(platsDuDebut);
  const [index, setIndex] = useState(0);
  const [finDeSerie, setFinDeSerie] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const plat = plats[index];

  async function repondre(rating: Note | null) {
    setEnvoi(true);
    setErreur(null);
    // « Jamais goûté » sur un plat sans note : rien à enregistrer
    const message =
      plat.rating === null && rating === null ? null : await envoyerNote(plat.id, rating);
    setEnvoi(false);
    if (message) {
      setErreur(message);
      return;
    }
    onNote(plat.id, rating);
    setIndex(index + 1);
    if ((index + 1) % TAILLESERIE === 0 || index + 1 >= plats.length) setFinDeSerie(true);
  }

  const debutSerie = Math.floor(index / TAILLESERIE) * TAILLESERIE;
  const tailleSerie = Math.min(TAILLESERIE, plats.length - debutSerie);
  const restants = plats.length - index;

  if (finDeSerie) {
    return (
      <div className="mt-4 rounded-[16px_12px_18px_14px] border-[2.5px] border-palme p-4 text-center">
        <p className="font-display text-2xl font-semibold text-foret">
          Bravo, c&apos;est noté&nbsp;!
        </p>
        <p className="mt-1 text-sm font-semibold text-cacao">
          Umami connaît déjà mieux vos goûts. Tu pourras en noter d&apos;autres quand tu veux.
        </p>
        <button type="button" onClick={onFin} className={`${bouton} mt-4 bg-foret text-or`}>
          Terminer
        </button>
        {restants > 0 && (
          <button
            type="button"
            onClick={() => setFinDeSerie(false)}
            className="press mt-2 h-11 w-full font-extrabold text-palme underline"
          >
            Noter d&apos;autres plats ({restants})
          </button>
        )}
      </div>
    );
  }

  if (!plat) return null;

  return (
    <div className="mt-4 rounded-[16px_12px_18px_14px] border-[2.5px] border-palme p-4">
      <p className="text-sm font-bold text-cacao" aria-live="polite">
        Plat {index - debutSerie + 1} sur {tailleSerie}
      </p>
      <div className="mt-2 h-1.5 rounded-full bg-sable">
        <div
          className="h-1.5 rounded-full bg-sirop transition-all"
          style={{ width: `${((index - debutSerie) / tailleSerie) * 100}%` }}
        />
      </div>

      <h3 key={plat.id} className="mt-4 animate-slide-in font-display text-2xl font-semibold">
        {plat.title}
      </h3>
      <p className="text-sm font-bold text-cacao">{plat.cuisine}</p>

      <div className="mt-4 flex flex-col gap-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          {NOTES.filter((n) => n.valeur !== 1).map((note) => (
            <button
              key={note.valeur}
              type="button"
              disabled={envoi}
              onClick={() => repondre(note.valeur)}
              className={`${bouton} ${note.valeur === 3 ? "bg-palme text-creme" : "bg-or text-foret"}`}
            >
              {note.libelle}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={envoi}
          onClick={() => repondre(1)}
          className={`${bouton} bg-rose text-puce`}
        >
          Je n&apos;aime pas
        </button>
        <button
          type="button"
          disabled={envoi}
          onClick={() => repondre(null)}
          className={`${bouton} border-[2.5px] border-foret text-foret`}
        >
          Jamais goûté
        </button>
      </div>

      {erreur && (
        <div className="mt-3">
          <MessageErreur>{erreur}</MessageErreur>
        </div>
      )}

      <button
        type="button"
        onClick={onFin}
        className="press mt-2 h-11 w-full font-extrabold text-cacao"
      >
        Plus tard
      </button>
    </div>
  );
}
