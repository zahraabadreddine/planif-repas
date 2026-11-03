import type { PlaceType } from "@prisma/client";

const RAYONTERREKM = 6371;

function radians(degres: number): number {
  return (degres * Math.PI) / 180;
}

/** Distance en km entre deux points GPS (formule de haversine). */
export function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return RAYONTERREKM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type MagasinAvecDistance = {
  id: string;
  name: string;
  type: PlaceType;
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  ouvert: boolean | null;
  lienItineraire: string;
};

type MagasinBrut = {
  id: string;
  name: string;
  type: PlaceType;
  address: string;
  latitude: number;
  longitude: number;
  openingHours: unknown;
};

/** Vérifie si un magasin est ouvert à l'instant donné, d'après ses horaires JSON. null si inconnu. */
function estOuvert(horaires: unknown, maintenant: Date): boolean | null {
  if (!horaires || typeof horaires !== "object") return null;
  const h = horaires as Record<string, string>;
  const jours = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const jour = jours[maintenant.getDay()];
  if (!jour || !h[jour]) return null;
  const plage = h[jour];
  const match = plage.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const minutes = maintenant.getHours() * 60 + maintenant.getMinutes();
  const debut = Number(match[1]) * 60 + Number(match[2]);
  const fin = Number(match[3]) * 60 + Number(match[4]);
  return minutes >= debut && minutes < fin;
}

/** Lien d'itinéraire Google Maps vers un point GPS. */
function lienItineraire(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Trie les magasins par distance et renvoie les `limite` plus proches, en excluant les fermés. */
export function magasinsProches(
  magasins: MagasinBrut[],
  latRef: number,
  lngRef: number,
  limite: number,
  maintenant: Date,
): MagasinAvecDistance[] {
  return magasins
    .map((m) => {
      const ouvert = estOuvert(m.openingHours, maintenant);
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        address: m.address,
        latitude: m.latitude,
        longitude: m.longitude,
        distanceKm: haversine(latRef, lngRef, m.latitude, m.longitude),
        ouvert,
        lienItineraire: lienItineraire(m.latitude, m.longitude),
      };
    })
    .filter((m) => m.ouvert !== false)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limite);
}
