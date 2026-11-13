"use client";

import { useEffect, useRef, useState } from "react";
import type { LatLngExpression } from "leaflet";

type Marqueur = {
  id: string;
  position: [number, number];
  label: string;
  detail?: string;
};

type Props = {
  centre: LatLngExpression;
  zoom?: number;
  marqueurs?: Marqueur[];
  onSelectMarqueur?: (id: string) => void;
  className?: string;
};

export default function CarteLeaflet({
  centre,
  zoom = 13,
  marqueurs = [],
  onSelectMarqueur,
  className = "",
}: Props) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const carteRef = useRef<L.Map | null>(null);
  const [pret, setPret] = useState(false);

  useEffect(() => {
    if (!conteneurRef.current || carteRef.current) return;

    let annule = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (annule || !conteneurRef.current) return;

      const carte = L.map(conteneurRef.current).setView(centre, zoom);
      carteRef.current = carte;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(carte);

      const iconePoint = L.divIcon({
        html: `<svg width="28" height="38" viewBox="0 0 28 38" fill="none"><path d="M14 37s-13-11-13-22a13 13 0 0126 0c0 11-13 22-13 22z" fill="#344F30" stroke="#13260F" stroke-width="1.5"/><circle cx="14" cy="15" r="5" fill="#FDD973"/></svg>`,
        className: "",
        iconSize: [28, 38],
        iconAnchor: [14, 38],
        popupAnchor: [0, -34],
      });

      for (const m of marqueurs) {
        const marker = L.marker(m.position, { icon: iconePoint }).addTo(carte);
        marker.bindPopup(
          `<strong style="font-size:14px">${m.label}</strong>${m.detail ? `<br/><span style="font-size:12px;color:#666">${m.detail}</span>` : ""}`,
        );
        if (onSelectMarqueur) {
          marker.on("click", () => onSelectMarqueur(m.id));
        }
      }

      setPret(true);
    })();

    return () => {
      annule = true;
      if (carteRef.current) {
        carteRef.current.remove();
        carteRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative overflow-hidden rounded-[18px_14px_20px_16px] ${className}`}>
      <div ref={conteneurRef} className="h-full w-full" />
      {!pret && (
        <div className="absolute inset-0 flex items-center justify-center bg-sable/60">
          <span className="font-hand text-xl text-puce">Chargement de la carte…</span>
        </div>
      )}
    </div>
  );
}
