import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { CUISINES, type Cuisine, type Foyer } from "@/lib/validation/foyer";

// Profil du foyer (EF-03). Le foyer vient toujours de la session, jamais de la requête.

export type ProfilFoyer = Foyer & { id: string };

const champs = {
  id: true,
  name: true,
  weeklyBudgetFcfa: true,
  cuisinesPreferred: true,
  shoppingDay: true,
} as const;

type LigneFoyer = {
  id: string;
  name: string;
  weeklyBudgetFcfa: number;
  cuisinesPreferred: unknown;
  shoppingDay: number | null;
};

const cuisinesConnues = new Set<string>(CUISINES.map((cuisine) => cuisine.valeur));

/** cuisinesPreferred est un champ Json : on ne garde que les cuisines connues. */
function versProfil(ligne: LigneFoyer): ProfilFoyer {
  const cuisines = Array.isArray(ligne.cuisinesPreferred) ? ligne.cuisinesPreferred : [];
  return {
    ...ligne,
    cuisinesPreferred: cuisines.filter((c): c is Cuisine => cuisinesConnues.has(c)),
  };
}

/** Foyer de la session, ou null si le parent ne l'a pas encore décrit. */
export async function lireFoyer(session: SessionVerifiee): Promise<ProfilFoyer | null> {
  if (!session.householdId) return null;
  const ligne = await prisma.household.findUnique({
    where: { id: session.householdId },
    select: champs,
  });
  return ligne ? versProfil(ligne) : null;
}

/**
 * Crée le foyer de la session s'il n'existe pas, sinon le modifie.
 * Seuls ces champs changent : membres, équipement et quartier ne sont jamais écrasés.
 */
export async function enregistrerFoyer(
  session: SessionVerifiee,
  donnees: Foyer,
): Promise<{ foyer: ProfilFoyer; cree: boolean }> {
  if (session.householdId) {
    const ligne = await prisma.household.update({
      where: { id: session.householdId },
      data: donnees,
      select: champs,
    });
    return { foyer: versProfil(ligne), cree: false };
  }

  return prisma.$transaction(async (tx) => {
    // Un compte possède au plus un foyer (ownerId unique) : on le reprend s'il existe déjà.
    const existant = await tx.household.findUnique({
      where: { ownerId: session.userId },
      select: { id: true },
    });
    const ligne = existant
      ? await tx.household.update({ where: { id: existant.id }, data: donnees, select: champs })
      : await tx.household.create({
          data: { ...donnees, ownerId: session.userId },
          select: champs,
        });
    await tx.user.update({
      where: { id: session.userId },
      data: { householdId: ligne.id, householdAccess: null },
    });
    return { foyer: versProfil(ligne), cree: !existant };
  });
}
