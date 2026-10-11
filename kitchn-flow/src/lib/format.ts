/** 18400 → "18 400 FCFA" */
export function fcfa(amount: number, withUnit = true): string {
  const n = String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return withUnit ? `${n} FCFA` : n;
}

/** Lien de partage WhatsApp (ouvert par un simple lien, sans serveur ni clé) */
export function whatsappLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Lien Google Maps vers un lieu */
export function mapsLink(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function expiryLabel(days: number): string {
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "demain";
  return `${days} jours`;
}

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
