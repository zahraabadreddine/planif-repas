import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";

// Consentement aux données de santé (allergies, régimes), CLAUDE.md §13.

export async function aConsentiSante(session: SessionVerifiee): Promise<boolean> {
  const utilisatrice = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { consentHealthAt: true },
  });
  return Boolean(utilisatrice?.consentHealthAt);
}

/** Enregistre la date du consentement, sans écraser celle d'un consentement déjà donné. */
export async function enregistrerConsentementSante(session: SessionVerifiee): Promise<void> {
  await prisma.user.updateMany({
    where: { id: session.userId, consentHealthAt: null },
    data: { consentHealthAt: new Date() },
  });
}
