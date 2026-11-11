import { ErreurApi } from "@/lib/erreurs";
import { JOURSSEMAINE, type MenuCompose, type RepasCompose } from "./composition";

// Réorganisation du menu demandée par la famille (EF-07, mode urgence §11) : échanger deux repas,
// décaler les dîners d'un jour, changer les portions. Fonctions pures : elles calculent la nouvelle
// semaine, le code la revérifie ensuite avec verifierMenu avant tout enregistrement (règle 1).

export type Creneau = "breakfast" | "lunch" | "dinner";

/** Un repas du menu, placé par son jour dans la semaine (0 pour le lundi). */
export type RepasPlace = {
  id: string;
  recipeId: string;
  jour: number;
  slot: Creneau;
  servings: number;
  leftoverFromId: string | null;
};

/** Identifiant provisoire du plat d'urgence, créé à l'enregistrement. */
export const NOUVEAUREPAS = "nouveau";

const DERNIERJOUR = JOURSSEMAINE - 1;

const refuser = (message: string): never => {
  throw new ErreurApi("REPASINCOMPATIBLE", message);
};

function occupant(repas: RepasPlace[], jour: number, slot: Creneau, sauf: string) {
  return repas.find((r) => r.id !== sauf && r.jour === jour && r.slot === slot);
}

/** Place un repas à un créneau ; celui qui l'occupait prend sa place d'avant. */
function placer(repas: RepasPlace[], deplace: RepasPlace, jour: number, slot: Creneau) {
  const autre = occupant(repas, jour, slot, deplace.id);
  if (autre) {
    autre.jour = deplace.jour;
    autre.slot = deplace.slot;
  }
  deplace.jour = jour;
  deplace.slot = slot;
}

/** Le reste d'un dîner cuisiné en double se mange toujours le lendemain midi. */
function ramenerReste(repas: RepasPlace[], diner: RepasPlace) {
  const reste = repas.find((r) => r.leftoverFromId === diner.id);
  if (!reste) return;
  if (diner.slot !== "dinner")
    refuser("Un plat cuisiné en double pour le lendemain reste un dîner.");
  if (diner.jour >= DERNIERJOUR) {
    refuser("Ce dîner prévoit des restes pour le lendemain midi, qui n'est plus dans la semaine.");
  }
  placer(repas, reste, diner.jour + 1, "lunch");
}

/**
 * Déplace un repas à un autre créneau de la semaine. Si le créneau est pris, les deux repas
 * échangent leur place ; un dîner cuisiné en double emmène son reste au lendemain midi.
 */
export function echangerRepas(
  repas: RepasPlace[],
  id: string,
  jour: number,
  slot: Creneau,
): RepasPlace[] {
  const copie = repas.map((r) => ({ ...r }));
  const deplace = copie.find((r) => r.id === id);
  if (!deplace) throw new ErreurApi("INTROUVABLE");
  if (jour < 0 || jour > DERNIERJOUR) {
    refuser("La date doit rester dans la semaine du menu.");
  }
  if (slot === "breakfast")
    refuser("Le menu ne prévoit pas de petit-déjeuner : choisis le midi ou le soir.");
  if (deplace.leftoverFromId) {
    refuser("Ce repas est le reste du dîner de la veille : déplace plutôt ce dîner.");
  }
  const autre = occupant(copie, jour, slot, id);
  if (autre?.leftoverFromId) {
    refuser("Ce créneau est le reste du dîner de la veille : choisis un autre repas.");
  }

  placer(copie, deplace, jour, slot);
  ramenerReste(copie, deplace);
  if (autre) ramenerReste(copie, autre);
  return copie;
}

export type Decalage = {
  repas: RepasPlace[];
  // Repas retirés du menu (le dernier dîner, ou un reste qui n'a plus de lendemain)
  retires: string[];
};

/**
 * Mode urgence : le plat rapide prend le dîner de ce soir, et chaque dîner suivant glisse d'un jour.
 * Le dernier dîner de la semaine sort du menu (ses ingrédients restent en stock), sauf si l'avant-dernier
 * soir était cuisiné en double : son plat est alors mangé au dernier midi et rien n'est perdu.
 * Les restes suivent leur dîner ; les déjeuners ordinaires gardent leur ordre et comblent les places libres.
 */
/**
 * Mode urgence à midi : le plat rapide prend le déjeuner du jour, et chaque déjeuner ordinaire
 * glisse au midi libre suivant. Les midis de restes ne bougent pas (ils suivent leur dîner) ;
 * le dernier déjeuner qui n'a plus de place sort du menu (ses ingrédients restent en stock).
 * Des restes ce midi ne sont jamais remplacés : ils sont déjà cuisinés, ce serait les jeter.
 */
export function decalerDejeuners(
  repas: RepasPlace[],
  jourDepart: number,
  recetteRapideId: string,
  personnes: number,
  // Midis d'un repas de fête : jamais occupés par un déjeuner ordinaire
  joursDeFete: number[] = [],
): Decalage {
  const copie = repas.map((r) => ({ ...r }));
  const ceMidi = copie.find((r) => r.slot === "lunch" && r.jour === jourDepart);
  if (ceMidi?.leftoverFromId) {
    refuser(
      "Ce midi, ce sont les restes d'hier : ils sont déjà prêts, il suffit de les réchauffer.",
    );
  }
  const midisDeRestes = new Set(
    copie.filter((r) => r.slot === "lunch" && r.leftoverFromId).map((r) => r.jour),
  );
  const places: number[] = [];
  for (let jour = jourDepart + 1; jour <= DERNIERJOUR; jour++) {
    if (!midisDeRestes.has(jour) && !joursDeFete.includes(jour)) places.push(jour);
  }
  const ordinaires = copie
    .filter((r) => r.slot === "lunch" && !r.leftoverFromId && r.jour >= jourDepart)
    .sort((a, b) => a.jour - b.jour);
  const retires: string[] = [];
  ordinaires.forEach((r, i) => {
    if (i < places.length) r.jour = places[i];
    else retires.push(r.id);
  });
  const gardes = copie.filter((r) => !retires.includes(r.id));
  gardes.push({
    id: NOUVEAUREPAS,
    recipeId: recetteRapideId,
    jour: jourDepart,
    slot: "lunch",
    servings: personnes,
    leftoverFromId: null,
  });
  return { repas: gardes, retires };
}

export function decalerDiners(
  repas: RepasPlace[],
  jourDepart: number,
  recetteRapideId: string,
  personnes: number,
): Decalage {
  if (jourDepart >= DERNIERJOUR) {
    refuser("C'est le dernier soir du menu : il n'y a pas de lendemain où décaler le dîner.");
  }
  const copie = repas.map((r) => ({ ...r }));
  const dinerDu = (jour: number) => copie.find((r) => r.slot === "dinner" && r.jour === jour);
  const resteDe = (diner: RepasPlace | undefined) =>
    diner ? copie.find((r) => r.leftoverFromId === diner.id) : undefined;

  // Le dîner de l'avant-dernier soir cuisiné en double ne peut pas glisser au dernier soir : son reste
  // n'aurait plus de lendemain. Son plat est alors mangé au dernier midi, à la place de ce reste,
  // et le dernier dîner est gardé. Sinon, c'est le dernier dîner qui sort du menu.
  const avantDernier = dinerDu(DERNIERJOUR - 1);
  const resteAvantDernier = resteDe(avantDernier);
  const versMidi =
    avantDernier && resteAvantDernier && avantDernier.jour >= jourDepart ? avantDernier : null;
  const sortant = versMidi ?? dinerDu(DERNIERJOUR);
  const limite = sortant?.jour ?? JOURSSEMAINE;
  for (const diner of copie.filter((r) => r.slot === "dinner")) {
    if (diner.jour >= jourDepart && diner.jour < limite) diner.jour += 1;
  }

  const dejeuners = copie.filter((r) => r.slot === "lunch" && r.jour > jourDepart);
  const ordinaires = dejeuners.filter((r) => !r.leftoverFromId).sort((a, b) => a.jour - b.jour);
  const restes = dejeuners.filter((r) => r.leftoverFromId && r !== resteAvantDernier);
  const places = new Set<string>();

  for (let jour = jourDepart + 1; jour <= DERNIERJOUR; jour++) {
    const veille = copie.find((r) => r.slot === "dinner" && r.jour === jour - 1 && r !== versMidi);
    const reste = veille ? restes.find((r) => r.leftoverFromId === veille.id) : undefined;
    const midi = reste ?? ordinaires.shift();
    if (midi) {
      midi.jour = jour;
      places.add(midi.id);
    } else if (versMidi && !places.has(versMidi.id)) {
      // Cuisiné une seule fois, pour ce midi : ses portions sans celles de l'ancien reste
      versMidi.servings = Math.max(1, versMidi.servings - (resteAvantDernier?.servings ?? 0));
      versMidi.jour = jour;
      versMidi.slot = "lunch";
      places.add(versMidi.id);
    } else {
      refuser("Impossible de décaler les dîners sans perdre un repas de la semaine.");
    }
  }
  if (restes.some((r) => !places.has(r.id)) || (versMidi && !places.has(versMidi.id))) {
    refuser("Impossible de décaler les dîners sans perdre un repas de la semaine.");
  }

  const retires = versMidi ? [resteAvantDernier!.id] : sortant ? [sortant.id] : [];
  const gardes = copie.filter((r) => !retires.includes(r.id));
  gardes.push({
    id: NOUVEAUREPAS,
    recipeId: recetteRapideId,
    jour: jourDepart,
    slot: "dinner",
    servings: personnes,
    leftoverFromId: null,
  });
  return { repas: gardes, retires };
}

/**
 * Nouveau nombre de portions d'un repas. Un dîner cuisiné en double garde son reste :
 * il couvre ses propres portions et celles du lendemain midi.
 */
export function changerPortionsRepas(
  repas: RepasPlace[],
  id: string,
  servings: number,
): RepasPlace[] {
  const copie = repas.map((r) => ({ ...r }));
  const cible = copie.find((r) => r.id === id);
  if (!cible) throw new ErreurApi("INTROUVABLE");

  if (cible.leftoverFromId) {
    const diner = copie.find((r) => r.id === cible.leftoverFromId);
    if (diner) diner.servings = diner.servings - cible.servings + servings;
    cible.servings = servings;
    return copie;
  }
  const reste = copie.find((r) => r.leftoverFromId === cible.id);
  cible.servings = servings + (reste?.servings ?? 0);
  return copie;
}

/** La semaine sous la forme attendue par verifierMenu, coûts recalculés par le code (règle 3). */
export function versMenuVerifiable(
  repas: RepasPlace[],
  coutParPortion: (recipeId: string) => number,
): MenuCompose {
  const ordre = [...repas]
    .filter((r) => r.slot !== "breakfast")
    .sort((a, b) => a.jour - b.jour || (a.slot === "lunch" ? -1 : 1));
  const composes: RepasCompose[] = ordre.map((r) => {
    const reste = r.leftoverFromId !== null;
    return {
      jour: r.jour,
      slot: r.slot === "lunch" ? "lunch" : "dinner",
      recetteId: r.recipeId,
      portions: r.servings,
      resteDe: reste ? ordre.findIndex((d) => d.id === r.leftoverFromId) : null,
      coutFcfa: reste ? 0 : coutParPortion(r.recipeId) * r.servings,
    };
  });
  return {
    repas: composes,
    totalFcfa: composes.reduce((total, r) => total + r.coutFcfa, 0),
    principauxRepetes: [],
  };
}
