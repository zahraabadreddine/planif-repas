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
};

export function construireTableSurnoms(membres: MembreFoyer[]): TableSurnoms {
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
  return { versLibelle, versSurnom };
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
  let resultat = texte;
  for (const [surnom, libelle] of table.versLibelle) {
    if (surnom.length === 0) continue;
    const regex = new RegExp(`\\b${echapperRegex(surnom)}\\b`, "gi");
    resultat = resultat.replace(regex, libelle);
  }
  return resultat;
}

export function restaurerSurnoms(texte: string, table: TableSurnoms): string {
  if (table.versSurnom.size === 0) return texte;
  let resultat = texte;
  for (const [libelle, surnom] of table.versSurnom) {
    if (libelle.length === 0) continue;
    const regex = new RegExp(`\\b${echapperRegex(libelle)}\\b`, "gi");
    resultat = resultat.replace(regex, surnom);
  }
  return resultat;
}

function echapperRegex(texte: string): string {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const listeDeTextes = z.array(z.string()).catch([]);

const JOURS_SEMAINE = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

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

  const [foyer, membres, stock, menu, preferences, quartier] = await Promise.all([
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
  ]);

  const table = construireTableSurnoms(membres);
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
  return JOURS_SEMAINE[new Date().getDay()] ?? "lundi";
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
