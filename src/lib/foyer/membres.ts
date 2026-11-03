import type { AgeGroup, RestrictionType, Severity } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { ageEnAnnees, dateDuJour, trancheDAge } from "@/lib/foyer/age";
import { aConsentiSante } from "@/lib/foyer/consentement";
import {
  ALLERGENES,
  REGIMES,
  aDesRestrictions,
  type Allergene,
  type Membre,
  type Regime,
} from "@/lib/validation/membre";

// Membres du foyer (EF-03). Le foyer vient toujours de la session (règle 4) :
// un membre d'un autre foyer est traité comme introuvable.

export type MembreFoyer = Omit<Membre, "ageGroup"> & {
  id: string;
  ageGroup: AgeGroup;
  // Âge en années, quand la date de naissance est connue
  age: number | null;
};

const allergenesConnus = new Set<string>(ALLERGENES.map((a) => a.valeur));
const regimesConnus = new Set<string>(REGIMES.map((r) => r.valeur));

const avecRestrictions = {
  restrictions: {
    select: { type: true, value: true },
    orderBy: { createdAt: "asc" as const },
  },
};

type LigneMembre = {
  id: string;
  label: string;
  ageGroup: AgeGroup;
  birthDate: Date | null;
  restrictions: { type: RestrictionType; value: string }[];
};

function versMembre(ligne: LigneMembre, aujourdhui: string): MembreFoyer {
  const birthDate = ligne.birthDate ? ligne.birthDate.toISOString().slice(0, 10) : null;
  const age = birthDate ? ageEnAnnees(birthDate, aujourdhui) : null;
  const valeurs = (type: RestrictionType) =>
    ligne.restrictions.filter((r) => r.type === type).map((r) => r.value);
  const allergies = valeurs("allergy");
  return {
    id: ligne.id,
    label: ligne.label,
    birthDate,
    // Avec une date de naissance, la tranche suit l'âge réel : un enfant de 11 ans devient ado à 12.
    ageGroup: age === null ? ligne.ageGroup : trancheDAge(age),
    age,
    allergies: allergies.filter((v): v is Allergene => allergenesConnus.has(v)),
    autresAllergies: allergies.filter((v) => !allergenesConnus.has(v)),
    regimes: valeurs("diet").filter((v): v is Regime => regimesConnus.has(v)),
  };
}

/** Allergies et régimes sont toujours stricts : ce sont des filtres durs du planificateur. */
function restrictionsDe(membre: Membre) {
  const strict = (type: RestrictionType) => (value: string) => ({
    type,
    value,
    severity: "strict" as Severity,
  });
  return [
    ...membre.allergies.map(strict("allergy")),
    ...membre.autresAllergies.map(strict("allergy")),
    ...membre.regimes.map(strict("diet")),
  ];
}

/** Avec une date de naissance, la tranche d'âge est toujours recalculée par le serveur. */
function champsMembre(membre: Membre) {
  const ageGroup = membre.birthDate
    ? trancheDAge(ageEnAnnees(membre.birthDate, dateDuJour()))
    : membre.ageGroup!;
  return {
    label: membre.label,
    ageGroup,
    birthDate: membre.birthDate ? new Date(`${membre.birthDate}T00:00:00Z`) : null,
  };
}

async function foyerPourEcrire(session: SessionVerifiee, membre: Membre): Promise<string> {
  if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");
  if (aDesRestrictions(membre) && !(await aConsentiSante(session))) {
    throw new ErreurApi("CONSENTEMENTREQUIS");
  }
  return session.householdId;
}

export async function listerMembres(session: SessionVerifiee): Promise<MembreFoyer[]> {
  if (!session.householdId) return [];
  const lignes = await prisma.householdMember.findMany({
    where: { householdId: session.householdId },
    include: avecRestrictions,
    orderBy: { createdAt: "asc" },
  });
  const aujourdhui = dateDuJour();
  return lignes.map((ligne) => versMembre(ligne, aujourdhui));
}

export async function ajouterMembre(
  session: SessionVerifiee,
  membre: Membre,
): Promise<MembreFoyer> {
  const householdId = await foyerPourEcrire(session, membre);
  const ligne = await prisma.householdMember.create({
    data: {
      householdId,
      ...champsMembre(membre),
      restrictions: { create: restrictionsDe(membre) },
    },
    include: avecRestrictions,
  });
  return versMembre(ligne, dateDuJour());
}

export async function modifierMembre(
  session: SessionVerifiee,
  id: string,
  membre: Membre,
): Promise<MembreFoyer> {
  const householdId = await foyerPourEcrire(session, membre);
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.householdMember.updateMany({
      where: { id, householdId },
      data: champsMembre(membre),
    });
    if (count === 0) throw new ErreurApi("INTROUVABLE");
    await tx.memberRestriction.deleteMany({ where: { memberId: id } });
    await tx.memberRestriction.createMany({
      data: restrictionsDe(membre).map((r) => ({ ...r, memberId: id })),
    });
    const ligne = await tx.householdMember.findUniqueOrThrow({
      where: { id },
      include: avecRestrictions,
    });
    return versMembre(ligne, dateDuJour());
  });
}

/** Retire un membre et ses restrictions (suppression en cascade). */
export async function retirerMembre(session: SessionVerifiee, id: string): Promise<void> {
  if (!session.householdId) throw new ErreurApi("INTROUVABLE");
  const { count } = await prisma.householdMember.deleteMany({
    where: { id, householdId: session.householdId },
  });
  if (count === 0) throw new ErreurApi("INTROUVABLE");
}
