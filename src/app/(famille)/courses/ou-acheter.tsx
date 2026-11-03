"use client";

import { useState } from "react";
import type { PlaceType } from "@prisma/client";
import { PinIcon } from "@/components/icones";
import { MessageErreur } from "@/components/champ-formulaire";
import { cx, fcfa } from "@/lib/format";
import { nombre, pluriel } from "@/lib/catalogue/quantites";

const COULEURS: Record<PlaceType, { bg: string; text: string; border: string }> = {
  market: { bg: "bg-carmin/10", text: "text-carmin", border: "border-carmin/30" },
  supermarket: { bg: "bg-canard/10", text: "text-canard", border: "border-canard/30" },
  shop: { bg: "bg-palme/10", text: "text-palme", border: "border-palme/30" },
};

type Article = {
  ingredientId: string;
  ingredient: string;
  placeType: PlaceType;
  quantity: number;
  unit: string;
  estimatedPriceFcfa: number | null;
};

type Magasin = {
  id: string;
  name: string;
  type: PlaceType;
  address: string;
  distanceKm: number;
  ouvert: boolean | null;
  lienItineraire: string;
};

type Lieu = {
  placeType: PlaceType;
  label: string;
  articles: Article[];
  magasins: Magasin[];
};

type Resultat = { lieux: Lieu[] };

function distanceTexte(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function BadgeOuvert({ ouvert }: { ouvert: boolean | null }) {
  if (ouvert === null) return null;
  return (
    <span
      className={cx(
        "ml-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold",
        ouvert ? "bg-palme/15 text-palme" : "bg-carmin/15 text-carmin",
      )}
    >
      {ouvert ? "ouvert" : "fermé"}
    </span>
  );
}

function SectionLieu({ lieu }: { lieu: Lieu }) {
  const couleur = COULEURS[lieu.placeType];
  return (
    <section className={cx("rounded-2xl border-2 p-4", couleur.bg, couleur.border)}>
      <h3 className={cx("font-hand text-[24px] font-bold leading-none", couleur.text)}>
        {lieu.label}
      </h3>

      <ul className="mt-2 space-y-1">
        {lieu.articles.map((a) => (
          <li key={a.ingredientId} className="flex items-baseline gap-1.5 text-[14px]">
            <span className="font-extrabold">{a.ingredient}</span>
            <span className="text-cacao">
              {nombre(a.quantity)} {pluriel(a.unit, a.quantity)}
            </span>
            {a.estimatedPriceFcfa !== null && (
              <span className="ml-auto whitespace-nowrap text-[13px] font-bold text-puce">
                {fcfa(a.estimatedPriceFcfa)}
              </span>
            )}
          </li>
        ))}
      </ul>

      {lieu.magasins.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-wider text-cacao">
            Magasins proches
          </p>
          {lieu.magasins.map((m) => (
            <a
              key={m.id}
              href={m.lienItineraire}
              target="_blank"
              rel="noreferrer"
              className="press flex items-start gap-2 rounded-xl bg-white/60 px-3 py-2.5"
            >
              <PinIcon size={18} className={cx("mt-0.5 shrink-0", couleur.text)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold leading-tight">
                  {m.name}
                  <BadgeOuvert ouvert={m.ouvert} />
                </p>
                <p className="text-xs font-bold text-cacao">{m.address}</p>
              </div>
              <span className="shrink-0 text-xs font-extrabold text-cacao">
                {distanceTexte(m.distanceKm)}
              </span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

export function OuAcheter({ listeId }: { listeId: string }) {
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function charger() {
    setChargement(true);
    setErreur(null);

    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((ok, ko) =>
        navigator.geolocation.getCurrentPosition(ok, ko, { timeout: 8000 }),
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // position non disponible, le backend utilisera le centre du quartier
    }

    try {
      const params = new URLSearchParams();
      if (lat !== undefined && lng !== undefined) {
        params.set("lat", String(lat));
        params.set("lng", String(lng));
      }
      const reponse = await fetch(
        `/api/shopping-lists/${listeId}/where-to-buy?${params.toString()}`,
      );
      if (!reponse.ok) {
        const corps = (await reponse.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        setErreur(corps?.error?.message ?? "Impossible de charger les conseils.");
        setChargement(false);
        return;
      }
      const data = (await reponse.json()) as Resultat;
      setResultat(data);
    } catch {
      setErreur("Pas de connexion internet. Réessaie dans un instant.");
    }
    setChargement(false);
  }

  if (!resultat) {
    return (
      <div className="mt-5">
        <button
          type="button"
          onClick={charger}
          disabled={chargement}
          className="press flex h-12 w-full items-center justify-center gap-2 rounded-[14px_18px_16px_12px] bg-canard px-5 text-sm font-extrabold text-creme disabled:opacity-60"
        >
          <PinIcon size={18} className="text-or" />
          {chargement ? "Recherche des magasins…" : "Où acheter ?"}
        </button>
        {erreur && (
          <div className="mt-3">
            <MessageErreur>{erreur}</MessageErreur>
          </div>
        )}
      </div>
    );
  }

  if (resultat.lieux.length === 0) {
    return (
      <div className="paper-shadow mt-5 bg-[#FFFDF7] px-[18px] py-5 text-center">
        <p className="font-hand text-[23px] font-bold leading-tight text-puce">
          Aucun magasin trouvé près de chez toi
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <h2 className="font-hand text-[26px] font-bold leading-none text-puce">Où acheter</h2>
      {resultat.lieux.map((lieu) => (
        <SectionLieu key={lieu.placeType} lieu={lieu} />
      ))}
    </div>
  );
}
