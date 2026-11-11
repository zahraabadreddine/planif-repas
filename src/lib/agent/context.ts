import { z } from "zod";
import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { lireFoyer } from "@/lib/foyer/profil";
import { listerMembres, type MembreFoyer } from "@/lib/foyer/membres";
import { lireStock } from "@/lib/stock/lecture";
import { lireMenuCourant, type MenuEnregistre } from "@/lib/planificateur/generation";
import { dateDuJour } from "@/lib/foyer/age";
import { JOURS } from "@/lib/validation/foyer";

// Contexte anonymisé envoyé à l'IA (§10).
// Seul point de construction : jamais d'email, de nom complet, de date de naissance ni de GPS.

export type MembreAnonyme = {
  libelle: string;
  trancheAge: string;
  ageAnnees: number | null;
  allergies: string[];
  autresAllergies: string[];
  regimes: string[];
};

export type ProfilAnonyme = {
  budgetHebdoFcfa: number;
  cuisinesPreferees: string[];
  equipement: string[];
  commune: string | null;
  jourCourses: string | null;
  membres: MembreAnonyme[];
  preferences: { cle: string; valeur: string; explication: string }[];
};

export type ContexteMoment = {
  date: string;
  jour: string;
  menu: MenuEnregistre | null;
  aConsommerVite: {
    ingredient: string;
    quantite: number;
    unite: string;
    peremption: string | null;
  }[];
};

export type ContexteAgent = {
  profil: ProfilAnonyme;
  moment: ContexteMoment;
};

// --- Correspondance surnom ↔ libellé ---

export type TableSurnoms = {
  versLibelle: Map<string, string>;
  versSurnom: Map<string, string>;
  // Noms du catalogue qui contiennent un surnom (« Riz gras » pour un membre « Riz ») : jamais abîmés
  proteges?: string[];
};

/**
 * termesCatalogue : titres de recettes et noms d'ingrédients. Ceux qui contiennent un surnom sont
 * protégés du remplacement. Un terme identique à un surnom n'est pas protégé : la vie privée passe d'abord.
 */
export function construireTableSurnoms(
  membres: MembreFoyer[],
  termesCatalogue: string[] = [],
): TableSurnoms {
  const versLibelle = new Map<string, string>();
  const versSurnom = new Map<string, string>();
  const comptage = new Map<string, number>();
  for (const m of membres) {
    const surnom = m.label.trim().toLowerCase();
    const base = libelleAnonyme(m);
    const n = (comptage.get(base) ?? 0) + 1;
    comptage.set(base, n);
    const libelle = `${base} ${n}`;
    versLibelle.set(surnom, libelle);
    versSurnom.set(libelle.toLowerCase(), m.label);
  }
  const surnoms = [...versLibelle.keys()].filter((s) => s.length > 0);
  const proteges = [...new Set(termesCatalogue.map((terme) => terme.trim().toLowerCase()))]
    .filter((terme) => !versLibelle.has(terme))
    .filter((terme) => surnoms.some((surnom) => motEntier(surnom).test(terme)))
    // Les plus longs d'abord : « riz gras au poulet » avant « riz gras »
    .sort((a, b) => b.length - a.length);
  return { versLibelle, versSurnom, proteges };
}

const compteurs: Record<string, string> = {
  baby: "Bébé",
  toddler: "Petit enfant",
  child: "Enfant",
  teen: "Ado",
  adult: "Adulte",
  senior: "Senior",
};

function libelleAnonyme(membre: MembreFoyer): string {
  return compteurs[membre.ageGroup] ?? "Membre";
}

function numerotesParTranche(membres: MembreFoyer[]): MembreAnonyme[] {
  const comptage = new Map<string, number>();
  return membres.map((m) => {
    const base = libelleAnonyme(m);
    const n = (comptage.get(base) ?? 0) + 1;
    comptage.set(base, n);
    return {
      libelle: `${base} ${n}`,
      trancheAge: base,
      ageAnnees: m.age,
      allergies: [...m.allergies],
      autresAllergies: [...m.autresAllergies],
      regimes: [...m.regimes],
    };
  });
}

export function remplacerSurnoms(texte: string, table: TableSurnoms): string {
  if (table.versLibelle.size === 0) return texte;
  // Les noms du catalogue protégés sont mis de côté le temps du remplacement
  const mis: string[] = [];
  let resultat = texte;
  for (const terme of table.proteges ?? []) {
    resultat = resultat.replace(motEntier(terme), (trouve) => {
      mis.push(trouve);
      return `\u0000${mis.length - 1}\u0000`;
    });
  }
  for (const [surnom, libelle] of table.versLibelle) {
    if (surnom.length === 0) continue;
    resultat = resultat.replace(motEntier(surnom), libelle);
  }
  return resultat.replace(/\u0000(\d+)\u0000/g, (motif, n: string) => mis[Number(n)]);
}

export function restaurerSurnoms(texte: string, table: TableSurnoms): string {
  if (table.versSurnom.size === 0) return texte;
  let resultat = texte;
  for (const [libelle, surnom] of table.versSurnom) {
    if (libelle.length === 0) continue;
    resultat = resultat.replace(motEntier(libelle), surnom);
  }
  return resultat;
}

/**
 * Le mot entier, sans tenir compte des majuscules. `\b` ne connaît pas les lettres accentuées :
 * « Zoé » ne serait jamais remplacé. On borne donc par « ni lettre ni chiffre », accents compris.
 */
function motEntier(mot: string): RegExp {
  // Entre deux mots, n'importe quelle espace : les modèles écrivent souvent « Enfant 1 » avec une
  // espace fine insécable (U+202F), que la remise des surnoms doit reconnaître aussi
  const motif = echapperRegex(mot).replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}])${motif}(?![\\p{L}\\p{N}])`, "giu");
}

/** Espaces insécables ramenées à une espace simple, sans changer la longueur du texte. */
const espacesSimples = (texte: string) => texte.replace(/[  ]/g, " ");

function echapperRegex(texte: string): string {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Position jusqu'où un texte reçu en flux peut être affiché sans couper un libellé
 * (« Enf » puis « ant 1 ») : la fin, qui peut être le début d'un libellé, est gardée de côté.
 */
export function pointDeCoupe(texte: string, table: TableSurnoms): number {
  const libelles = [...table.versSurnom.keys()];
  if (libelles.length === 0) return texte.length;
  let coupe = Math.max(0, texte.length - Math.max(...libelles.map((l) => l.length)));
  const minuscules = espacesSimples(texte).toLowerCase();
  for (const libelle of libelles) {
    for (let i = minuscules.indexOf(libelle); i !== -1; i = minuscules.indexOf(libelle, i + 1)) {
      if (i < coupe && coupe < i + libelle.length) coupe = i;
    }
  }
  return coupe;
}

/** Affichage en flux : chaque morceau est envoyé avec les surnoms restaurés, sans couper de libellé. */
export function creerFluxSurnoms(table: TableSurnoms, envoyer: (texte: string) => void) {
  let enAttente = "";
  return {
    ajouter(morceau: string) {
      enAttente += morceau;
      const coupe = pointDeCoupe(enAttente, table);
      if (coupe === 0) return;
      envoyer(restaurerSurnoms(enAttente.slice(0, coupe), table));
      enAttente = enAttente.slice(coupe);
    },
    terminer() {
      if (enAttente) envoyer(restaurerSurnoms(enAttente, table));
      enAttente = "";
    },
  };
}

const listeDeTextes = z.array(z.string()).catch([]);

const JOURSSEMAINE = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export async function construireContexte(session: SessionVerifiee): Promise<{
  contexte: ContexteAgent;
  table: TableSurnoms;
}> {
  const householdId = session.householdId;
  if (!householdId) {
    return {
      contexte: {
        profil: {
          budgetHebdoFcfa: 0,
          cuisinesPreferees: [],
          equipement: [],
          commune: null,
          jourCourses: null,
          membres: [],
          preferences: [],
        },
        moment: { date: dateDuJour(), jour: jourDeLaSemaine(), menu: null, aConsommerVite: [] },
      },
      table: { versLibelle: new Map(), versSurnom: new Map() },
    };
  }

  const [foyer, membres, stock, menu, preferences, quartier, recettes, ingredients] =
    await Promise.all([
      lireFoyer(session),
      listerMembres(session),
      lireStock(session),
      lireMenuCourant(session),
      prisma.learnedPreference.findMany({
        where: { householdId, active: true },
        select: { key: true, value: true, explanation: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.household.findUnique({
        where: { id: householdId },
        select: {
          equipment: true,
          neighborhood: { select: { commune: true } },
        },
      }),
      // Noms du catalogue : un surnom comme « Riz » n'abîme pas « Riz gras » auprès de l'IA
      prisma.recipe.findMany({
        where: { OR: [{ householdId: null }, { householdId: session.householdId }] },
        select: { title: true },
      }),
      prisma.ingredient.findMany({ select: { name: true } }),
    ]);

  const table = construireTableSurnoms(membres, [
    ...recettes.map((r) => r.title),
    ...ingredients.map((i) => i.name),
  ]);
  const membresAnonymes = numerotesParTranche(membres);

  const aujourdhui = dateDuJour();
  const aConsommerVite = stock
    .filter((a) => a.status === "useSoon")
    .map((a) => ({
      ingredient: a.ingredientName,
      quantite: a.quantity,
      unite: a.unitLabel,
      peremption: a.expiresAt,
    }));

  const jourCourses = foyer?.shoppingDay
    ? (JOURS.find((j) => j.valeur === foyer.shoppingDay)?.libelle ?? null)
    : null;

  const contexte: ContexteAgent = {
    profil: {
      budgetHebdoFcfa: foyer?.weeklyBudgetFcfa ?? 0,
      cuisinesPreferees: foyer?.cuisinesPreferred ?? [],
      equipement: listeDeTextes.parse(quartier?.equipment ?? []),
      commune: quartier?.neighborhood?.commune ?? null,
      jourCourses,
      membres: membresAnonymes,
      preferences: preferences.map((p) => ({
        cle: p.key,
        valeur: p.value,
        explication: p.explanation,
      })),
    },
    moment: {
      date: aujourdhui,
      jour: jourDeLaSemaine(),
      menu,
      aConsommerVite,
    },
  };

  return { contexte, table };
}

function jourDeLaSemaine(): string {
  return JOURSSEMAINE[new Date().getDay()] ?? "lundi";
}

export function formaterContextePourPrompt(contexte: ContexteAgent): string {
  const { profil, moment } = contexte;
  const lignes: string[] = [];

  lignes.push(`Date : ${moment.date} (${moment.jour})`);
  lignes.push(`Budget hebdomadaire : ${profil.budgetHebdoFcfa} FCFA`);

  if (profil.commune) lignes.push(`Commune : ${profil.commune}`);
  if (profil.jourCourses) lignes.push(`Jour des courses : ${profil.jourCourses}`);
  if (profil.cuisinesPreferees.length > 0) {
    lignes.push(`Cuisines préférées : ${profil.cuisinesPreferees.join(", ")}`);
  }
  if (profil.equipement.length > 0) {
    lignes.push(`Équipement : ${profil.equipement.join(", ")}`);
  }

  if (profil.membres.length > 0) {
    lignes.push("");
    lignes.push("Membres du foyer :");
    for (const m of profil.membres) {
      const details: string[] = [m.trancheAge];
      if (m.ageAnnees !== null) details.push(`${m.ageAnnees} ans`);
      if (m.allergies.length > 0) details.push(`allergies : ${m.allergies.join(", ")}`);
      if (m.autresAllergies.length > 0)
        details.push(`autres allergies : ${m.autresAllergies.join(", ")}`);
      if (m.regimes.length > 0) details.push(`régimes : ${m.regimes.join(", ")}`);
      lignes.push(`- ${m.libelle} (${details.join(" ; ")})`);
    }
  }

  if (profil.preferences.length > 0) {
    lignes.push("");
    lignes.push("Préférences apprises :");
    for (const p of profil.preferences) {
      lignes.push(`- ${p.cle} : ${p.valeur}`);
    }
  }

  if (moment.aConsommerVite.length > 0) {
    lignes.push("");
    lignes.push("À consommer vite :");
    for (const a of moment.aConsommerVite) {
      const peremption = a.peremption ? ` (péremption : ${a.peremption.slice(0, 10)})` : "";
      lignes.push(`- ${a.ingredient} : ${a.quantite} ${a.unite}${peremption}`);
    }
  }

  if (moment.menu) {
    lignes.push("");
    lignes.push(`Menu en cours (semaine du ${moment.menu.weekStart}, ${moment.menu.status}) :`);
    for (const repas of moment.menu.meals) {
      lignes.push(
        `- ${repas.date} ${repas.slot} : ${repas.recipe.title} (${repas.recipe.minutes} min, ${repas.recipe.coutFcfa} FCFA)`,
      );
    }
  }

  return lignes.join("\n");
}
