import type { HouseholdAccess, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ErreurApi } from "@/lib/erreurs";
import { auth } from "./config";

/** Droit sur le foyer : la personne qui l'a créé, ou une personne invitée (modifier ou voir). */
export type AccesFoyer = "proprietaire" | HouseholdAccess;

export type SessionVerifiee = {
  userId: string;
  role: Role;
  householdId: string | null;
  // null sans foyer
  acces: AccesFoyer | null;
};

type LigneAcces = {
  id: string;
  householdId: string | null;
  householdAccess: HouseholdAccess | null;
  household: { ownerId: string } | null;
};

/** Le propriétaire est reconnu par Household.ownerId ; un droit manquant vaut lecture seule. */
export function accesAuFoyer(ligne: LigneAcces): AccesFoyer | null {
  if (!ligne.householdId) return null;
  if (ligne.household?.ownerId === ligne.id) return "proprietaire";
  return ligne.householdAccess ?? "view";
}

/**
 * Garde de session, côté serveur. Lève NONCONNECTE (401) sans session valide.
 * Relit l'utilisatrice en base : un compte supprimé est refusé, le foyer et le droit sont toujours à jour.
 */
export async function exigerSession(): Promise<SessionVerifiee> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new ErreurApi("NONCONNECTE");

  const utilisatrice = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      role: true,
      householdId: true,
      householdAccess: true,
      household: { select: { ownerId: true } },
    },
  });
  if (!utilisatrice) throw new ErreurApi("NONCONNECTE");

  return {
    userId: utilisatrice.id,
    role: utilisatrice.role,
    householdId: utilisatrice.householdId,
    acces: accesAuFoyer(utilisatrice),
  };
}

/** Garde de rôle admin, côté serveur. Lève NONCONNECTE (401) ou INTERDIT (403). */
export async function exigerAdmin(): Promise<SessionVerifiee> {
  const session = await exigerSession();
  if (session.role !== "admin") throw new ErreurApi("INTERDIT");
  return session;
}

/** Garde des routes qui écrivent des données du foyer : une personne en lecture seule est refusée (403). */
export async function exigerEcriture(): Promise<SessionVerifiee> {
  const session = await exigerSession();
  if (session.acces === "view") throw new ErreurApi("LECTURESEULE");
  return session;
}

/** Garde des invitations et des droits : seule la personne qui a créé le foyer passe (403). */
export async function exigerProprietaire(): Promise<SessionVerifiee & { householdId: string }> {
  const session = await exigerSession();
  if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");
  if (session.acces !== "proprietaire") {
    throw new ErreurApi("INTERDIT", "Seule la personne qui a créé le foyer peut faire ça.");
  }
  return { ...session, householdId: session.householdId };
}
