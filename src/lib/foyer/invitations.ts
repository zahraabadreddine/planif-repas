import { createHmac, randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { AccesFoyer, SessionVerifiee } from "@/lib/auth/garde";
import { creerLimiteur } from "@/lib/auth/limite";
import { ErreurApi } from "@/lib/erreurs";
import {
  ALPHABETCODE,
  DUREEINVITATIONMS,
  INVITATIONSMAX,
  LONGUEURCODE,
  type Acces,
} from "@/lib/validation/invitation";

// Partage du foyer (EF-03) : codes d'invitation, personnes du foyer et droits.
// Le foyer vient toujours de la session (règle 4).

/** Mauvais codes : 5 essais par compte toutes les 15 minutes, comme la connexion. */
export const limiteRejoindre = creerLimiteur();

export type PersonneFoyer = { id: string; nom: string; acces: AccesFoyer; moi: boolean };
export type InvitationEnAttente = { id: string; access: Acces; expiresAt: string };
export type PartageFoyer = { personnes: PersonneFoyer[]; invitations: InvitationEnAttente[] };

/** Code au hasard (générateur cryptographique), par exemple « K7M4PQ ». */
export function genererCode(): string {
  return Array.from(
    { length: LONGUEURCODE },
    () => ALPHABETCODE[randomInt(ALPHABETCODE.length)],
  ).join("");
}

/**
 * Empreinte stockée à la place du code. HMAC avec le secret du serveur plutôt que bcrypt :
 * il faut retrouver l'invitation par son empreinte, et la base seule ne permet pas de retrouver le code.
 */
export function empreinteCode(code: string): string {
  const secret = process.env.AUTHSECRET;
  if (!secret) throw new Error("AUTHSECRET manquant");
  return createHmac("sha256", secret).update(code).digest("hex");
}

/** Invitation encore utilisable : ni utilisée, ni annulée, ni expirée. */
const enAttente = (maintenant: Date) => ({
  usedAt: null,
  revokedAt: null,
  expiresAt: { gt: maintenant },
});

/** Personnes du foyer de la session, le propriétaire en premier ; codes en attente pour le propriétaire. */
export async function lirePartage(
  session: SessionVerifiee,
  maintenant = new Date(),
): Promise<PartageFoyer> {
  if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");
  const householdId = session.householdId;
  const [foyer, comptes, invitations] = await Promise.all([
    prisma.household.findUnique({ where: { id: householdId }, select: { ownerId: true } }),
    prisma.user.findMany({
      where: { householdId },
      select: { id: true, fullName: true, householdAccess: true },
      orderBy: { createdAt: "asc" },
    }),
    session.acces === "proprietaire"
      ? prisma.householdInvitation.findMany({
          where: { householdId, ...enAttente(maintenant) },
          select: { id: true, access: true, expiresAt: true },
          orderBy: { expiresAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const personnes = comptes.map((compte): PersonneFoyer => ({
    id: compte.id,
    nom: compte.fullName,
    acces: compte.id === foyer?.ownerId ? "proprietaire" : (compte.householdAccess ?? "view"),
    moi: compte.id === session.userId,
  }));
  return {
    personnes: personnes.sort(
      (a, b) => Number(b.acces === "proprietaire") - Number(a.acces === "proprietaire"),
    ),
    invitations: invitations.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() })),
  };
}

/** Crée un code d'invitation. Le code en clair n'est renvoyé qu'ici, une seule fois. */
export async function creerInvitation(
  session: SessionVerifiee & { householdId: string },
  access: Acces,
  maintenant = new Date(),
): Promise<InvitationEnAttente & { code: string }> {
  const householdId = session.householdId;
  const enCours = await prisma.householdInvitation.count({
    where: { householdId, ...enAttente(maintenant) },
  });
  if (enCours >= INVITATIONSMAX) throw new ErreurApi("TROPDINVITATIONS");

  // Deux codes identiques sont très improbables ; si cela arrive, on en tire un autre.
  for (let essai = 0; essai < 3; essai += 1) {
    const code = genererCode();
    try {
      const invitation = await prisma.householdInvitation.create({
        data: {
          householdId,
          codeHash: empreinteCode(code),
          access,
          createdById: session.userId,
          expiresAt: new Date(maintenant.getTime() + DUREEINVITATIONMS),
        },
        select: { id: true, access: true, expiresAt: true },
      });
      return { ...invitation, expiresAt: invitation.expiresAt.toISOString(), code };
    } catch (erreur) {
      const doublon =
        erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === "P2002";
      if (!doublon) throw erreur;
    }
  }
  throw new ErreurApi("ERREURSERVEUR");
}

/** Annule un code en attente du foyer de la session ; celui d'un autre foyer est introuvable. */
export async function annulerInvitation(
  session: SessionVerifiee & { householdId: string },
  id: string,
): Promise<void> {
  const { count } = await prisma.householdInvitation.updateMany({
    where: { id, householdId: session.householdId, usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) throw new ErreurApi("INTROUVABLE");
}

/**
 * Rejoint un foyer avec un code. Un compte qui a déjà un foyer ne peut pas en rejoindre un autre.
 * Code inconnu, expiré, utilisé ou annulé : même réponse, pour ne rien laisser deviner.
 */
export async function rejoindreFoyer(
  session: SessionVerifiee,
  code: string,
  maintenant = new Date(),
): Promise<{ access: Acces }> {
  const possede = await prisma.household.findUnique({
    where: { ownerId: session.userId },
    select: { id: true },
  });
  if (session.householdId || possede) throw new ErreurApi("DEJADANSUNFOYER");
  if (limiteRejoindre.estBloque(session.userId)) throw new ErreurApi("TROPDEREQUETES");

  const access = await prisma.$transaction(async (tx) => {
    const invitation = await tx.householdInvitation.findUnique({
      where: { codeHash: empreinteCode(code) },
      select: { id: true, householdId: true, access: true },
    });
    if (!invitation) return null;
    // Réservée seulement si elle est encore en attente : deux personnes ne peuvent pas l'utiliser.
    const { count } = await tx.householdInvitation.updateMany({
      where: { id: invitation.id, ...enAttente(maintenant) },
      data: { usedAt: maintenant, usedById: session.userId },
    });
    if (count === 0) return null;
    const rejoint = await tx.user.updateMany({
      where: { id: session.userId, householdId: null },
      data: { householdId: invitation.householdId, householdAccess: invitation.access },
    });
    if (rejoint.count === 0) throw new ErreurApi("DEJADANSUNFOYER");
    return invitation.access;
  });

  if (!access) {
    limiteRejoindre.noterEchec(session.userId);
    throw new ErreurApi("CODEINVALIDE");
  }
  limiteRejoindre.reinitialiser(session.userId);
  return { access };
}

/** Une personne invitée quitte le foyer ; la personne qui l'a créé ne peut pas le quitter. */
export async function quitterFoyer(session: SessionVerifiee): Promise<void> {
  if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");
  if (session.acces === "proprietaire") {
    throw new ErreurApi("INTERDIT", "Tu as créé ce foyer : tu ne peux pas le quitter.");
  }
  await prisma.user.update({
    where: { id: session.userId },
    data: { householdId: null, householdAccess: null },
  });
}

/** Personne invitée du foyer de la session, jamais soi-même : sinon introuvable. */
const personneInvitee = (session: SessionVerifiee & { householdId: string }, id: string) => ({
  id,
  householdId: session.householdId,
  NOT: { id: session.userId },
});

/** Change le droit d'une personne invitée. */
export async function changerAcces(
  session: SessionVerifiee & { householdId: string },
  id: string,
  access: Acces,
): Promise<void> {
  const { count } = await prisma.user.updateMany({
    where: personneInvitee(session, id),
    data: { householdAccess: access },
  });
  if (count === 0) throw new ErreurApi("INTROUVABLE");
}

/** Retire une personne invitée du foyer : son compte reste, sans foyer. */
export async function retirerPersonne(
  session: SessionVerifiee & { householdId: string },
  id: string,
): Promise<void> {
  const { count } = await prisma.user.updateMany({
    where: personneInvitee(session, id),
    data: { householdId: null, householdAccess: null },
  });
  if (count === 0) throw new ErreurApi("INTROUVABLE");
}
