"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  depart: [number, number];
  arrivee: [number, number];
  labelArrivee: string;
  detailArrivee?: string;
  className?: string;
};

type InfoTrajet = { distanceKm: number; dureeMin: number } | null;

export default function CarteItineraire({
  depart,
  arrivee,
  labelArrivee,
  detailArrivee,
  className = "",
}: Props) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const carteRef = useRef<L.Map | null>(null);
  const [pret, setPret] = useState(false);
  const [trajet, setTrajet] = useState<InfoTrajet>(null);

  useEffect(() => {
    if (!conteneurRef.current || carteRef.current) return;

    let annule = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (annule || !conteneurRef.current) return;

      const carte = L.map(conteneurRef.current);
      carteRef.current = carte;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(carte);

      const iconePin = L.divIcon({
        html: `<svg width="28" height="38" viewBox="0 0 28 38" fill="none"><path d="M14 37s-13-11-13-22a13 13 0 0126 0c0 11-13 22-13 22z" fill="#344F30" stroke="#13260F" stroke-width="1.5"/><circle cx="14" cy="15" r="5" fill="#FDD973"/></svg>`,
        className: "",
        iconSize: [28, 38],
        iconAnchor: [14, 38],
        popupAnchor: [0, -34],
      });

      const iconeUser = L.divIcon({
        html: `<div style="width:14px;height:14px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 0 6px rgba(59,130,246,0.5)"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      L.marker(depart, { icon: iconeUser })
        .addTo(carte)
        .bindPopup('<strong style="font-size:13px">📍 Ma position</strong>');

      const pinMagasin = L.marker(arrivee, { icon: iconePin }).addTo(carte);
      pinMagasin.bindPopup(
        `<strong style="font-size:14px">${labelArrivee}</strong>${detailArrivee ? `<br/><span style="font-size:12px;color:#666">${detailArrivee}</span>` : ""}`,
      );
      pinMagasin.openPopup();

      const bornes = L.latLngBounds([depart, arrivee]);
      carte.fitBounds(bornes, { padding: [40, 40] });

      setPret(true);

      try {
        const url = `https://router.project-osrm.org/route/v1/foot/${depart[1]},${depart[0]};${arrivee[1]},${arrivee[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const route = data?.routes?.[0];
        if (!route || annule) return;

        const coords: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]] as [number, number],
        );

        L.polyline(coords, {
          color: "#344F30",
          weight: 4,
          opacity: 0.8,
          dashArray: "8 6",
        }).addTo(carte);

        carte.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });

        setTrajet({
          distanceKm: route.distance / 1000,
          dureeMin: Math.ceil(route.duration / 60),
        });
      } catch {
        // OSRM indisponible — la carte reste affichée sans tracé
      }
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
      {trajet && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] flex items-center justify-center gap-3 rounded-[12px_16px_14px_10px] bg-foret/90 px-4 py-2.5 text-creme backdrop-blur-sm">
          <span className="font-hand text-lg font-bold">
            {trajet.distanceKm < 1
              ? `${Math.round(trajet.distanceKm * 1000)} m`
              : `${trajet.distanceKm.toFixed(1)} km`}
          </span>
          <span className="text-or">•</span>
          <span className="font-hand text-lg font-bold">
            ~{trajet.dureeMin} min à pied
          </span>
        </div>
      )}
    </div>
  );
}
