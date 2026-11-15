// Calendrier du menu : semaines du lundi au dimanche, dates sans heure (AAAA-MM-JJ), à l'heure
// d'Abidjan. Fonctions pures, utilisées par la page Menu et par le choix du « menu courant ».

const JOUR = 24 * 3600 * 1000;

const MOIS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];
const MOISLONGS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

const versDate = (jour: string) => new Date(`${jour}T00:00:00Z`);
const versJour = (date: Date) => date.toISOString().slice(0, 10);

/** Une vraie date au format AAAA-MM-JJ (le 31 février est refusé). */
export function dateValide(texte: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texte)) return false;
  const date = versDate(texte);
  return !Number.isNaN(date.getTime()) && versJour(date) === texte;
}

/** Le lundi de la semaine d'un jour (une semaine va du lundi au dimanche). */
export function lundiDe(jour: string): string {
  const date = versDate(jour);
  const depuisLundi = (date.getUTCDay() + 6) % 7;
  return versJour(new Date(date.getTime() - depuisLundi * JOUR));
}

/** La semaine d'avant (-1) ou d'après (+1), ou plus loin. */
export function decalerSemaine(lundi: string, semaines: number): string {
  return versJour(new Date(versDate(lundi).getTime() + semaines * 7 * JOUR));
}

/** Le lundi de la semaine en cours à Abidjan, quel que soit le pays du serveur. */
export function lundiCourant(maintenant = new Date()): string {
  const aujourdhui = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Abidjan" }).format(
    maintenant,
  );
  return lundiDe(aujourdhui);
}

/** « 16 → 22 nov. », ou « 30 nov. → 6 déc. » quand la semaine change de mois. */
export function libelleSemaine(lundi: string): string {
  const debut = versDate(lundi);
  const fin = new Date(debut.getTime() + 6 * JOUR);
  const moisDebut = MOIS[debut.getUTCMonth()];
  const moisFin = MOIS[fin.getUTCMonth()];
  return moisDebut === moisFin
    ? `${debut.getUTCDate()} → ${fin.getUTCDate()} ${moisFin}`
    : `${debut.getUTCDate()} ${moisDebut} → ${fin.getUTCDate()} ${moisFin}`;
}

/** « lundi 23 novembre » : pour le message préparé à Umi. */
export function lundiEnToutesLettres(lundi: string): string {
  const date = versDate(lundi);
  return `lundi ${date.getUTCDate()} ${MOISLONGS[date.getUTCMonth()]}`;
}

export type MenuCandidat = {
  id: string;
  weekStart: string;
  status: "draft" | "active" | "archived";
  createdAt: Date;
};

/** Le menu d'une semaine : le menu validé s'il existe, sinon le brouillon le plus récent. */
export function menuDeLaSemaine<T extends MenuCandidat>(menus: T[], lundi: string): T | null {
  const deLaSemaine = menus.filter((m) => m.weekStart === lundi && m.status !== "archived");
  const valide = deLaSemaine.find((m) => m.status === "active");
  if (valide) return valide;
  const brouillons = deLaSemaine
    .filter((m) => m.status === "draft")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return brouillons[0] ?? null;
}

/**
 * Le menu « courant » (accueil, Umi, « C'est cuisiné ») : celui de la semaine en cours ;
 * sinon le prochain à venir ; sinon le plus récent du passé.
 */
export function menuCourant<T extends MenuCandidat>(menus: T[], lundi: string): T | null {
  const cetteSemaine = menuDeLaSemaine(menus, lundi);
  if (cetteSemaine) return cetteSemaine;
  const semaines = [
    ...new Set(menus.filter((m) => m.status !== "archived").map((m) => m.weekStart)),
  ];
  const aVenir = semaines.filter((s) => s > lundi).sort();
  if (aVenir.length > 0) return menuDeLaSemaine(menus, aVenir[0]);
  const passees = semaines.filter((s) => s < lundi).sort();
  return passees.length > 0 ? menuDeLaSemaine(menus, passees[passees.length - 1]) : null;
}
