"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/format";

// Bouton micro du chat : on appuie pour parler, on appuie encore pour arrêter. Le texte écrit
// par le serveur arrive dans le champ de saisie : la famille le relit avant d'envoyer.

/** Arrêt automatique après une minute (le serveur refuse au-delà). */
const SECONDESMAX = 60;

/** Le premier format que le téléphone sait enregistrer : webm sur Android, mp4 sur iPhone. */
const FORMATS = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

type Props = {
  desactive: boolean;
  onTexte: (texte: string) => void;
  // Ce que la famille lit au-dessus de la saisie (« j'écoute… 0:12 »), ou null
  onStatut: (statut: string | null) => void;
  onErreur: (erreur: string | null) => void;
};

function duree(secondes: number): string {
  return `${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, "0")}`;
}

export function BoutonVocal({ desactive, onTexte, onStatut, onErreur }: Props) {
  const [etat, setEtat] = useState<"repos" | "ecoute" | "ecriture">("repos");
  const enregistreur = useRef<MediaRecorder | null>(null);
  const minuteur = useRef<ReturnType<typeof setInterval> | null>(null);

  // En quittant le chat, le micro est coupé
  useEffect(
    () => () => {
      if (minuteur.current) clearInterval(minuteur.current);
      enregistreur.current?.stream.getTracks().forEach((piste) => piste.stop());
    },
    [],
  );

  async function envoyer(audio: Blob) {
    setEtat("ecriture");
    onStatut("j'écris ce que tu as dit…");
    try {
      const formulaire = new FormData();
      formulaire.append("audio", audio, "vocal");
      const reponse = await fetch("/api/chat/vocal", { method: "POST", body: formulaire });
      const corps = await reponse.json().catch(() => null);
      if (!reponse.ok) {
        onErreur(corps?.error?.message ?? "Le vocal n'a pas pu être écrit. Réessaie.");
        return;
      }
      onTexte(String(corps?.texte ?? ""));
    } catch {
      onErreur("Pas de connexion. Réessaie dans un instant.");
    } finally {
      onStatut(null);
      setEtat("repos");
    }
  }

  async function commencer() {
    onErreur(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onErreur("Le micro n'est pas disponible ici : il faut ouvrir l'application en https.");
      return;
    }
    let flux: MediaStream;
    try {
      // Une seule voix, sans l'écho ni le bruit de la cuisine : Whisper comprend bien mieux
      flux = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch {
      onErreur("Autorise le micro dans ton navigateur pour parler à Umi.");
      return;
    }

    const format = FORMATS.find((f) => MediaRecorder.isTypeSupported(f));
    // 64 kbit/s : une voix nette, et une minute reste bien sous la limite du serveur (environ 500 Ko)
    const enregistrement = new MediaRecorder(flux, {
      ...(format ? { mimeType: format } : {}),
      audioBitsPerSecond: 64000,
    });
    const morceaux: Blob[] = [];
    const debut = Date.now();

    enregistrement.ondataavailable = (e) => {
      if (e.data.size > 0) morceaux.push(e.data);
    };
    enregistrement.onstop = () => {
      flux.getTracks().forEach((piste) => piste.stop());
      if (minuteur.current) clearInterval(minuteur.current);
      enregistreur.current = null;
      if (Date.now() - debut < 1000) {
        onStatut(null);
        setEtat("repos");
        onErreur("Trop court : appuie, parle, puis appuie encore pour arrêter.");
        return;
      }
      void envoyer(new Blob(morceaux, { type: enregistrement.mimeType }));
    };

    enregistreur.current = enregistrement;
    enregistrement.start();
    setEtat("ecoute");
    onStatut(`j'écoute… ${duree(0)} · appuie encore pour arrêter`);
    minuteur.current = setInterval(() => {
      const secondes = Math.floor((Date.now() - debut) / 1000);
      onStatut(`j'écoute… ${duree(secondes)} · appuie encore pour arrêter`);
      if (secondes >= SECONDESMAX) enregistrement.stop();
    }, 1000);
  }

  function arreter() {
    if (enregistreur.current?.state === "recording") enregistreur.current.stop();
  }

  const ecoute = etat === "ecoute";
  return (
    <button
      type="button"
      onClick={ecoute ? arreter : commencer}
      disabled={etat === "ecriture" || (desactive && !ecoute)}
      aria-label={ecoute ? "Arrêter le vocal" : "Parler à Umi"}
      aria-pressed={ecoute}
      className={cx(
        "press blob flex h-12 w-12 shrink-0 items-center justify-center disabled:opacity-60",
        ecoute ? "animate-pulse bg-carmin text-creme" : "bg-or text-puce",
      )}
    >
      {ecoute ? <IconeStop /> : <IconeMicro />}
    </button>
  );
}

function IconeMicro() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="3.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconeStop() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" />
    </svg>
  );
}
