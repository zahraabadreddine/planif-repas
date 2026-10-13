import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ErreurApi } from "@/lib/erreurs";
import { auth } from "./config";

export type SessionVerifiee = {
  userId: string;
  role: Role;
  householdId: string | null;
};

/**
 * Garde de session, côté serveur. Lève NONCONNECTE (401) sans session valide.
 * Relit l'utilisatrice en base : un compte supprimé est refusé et le foyer est toujours à jour.
 */
export async function exigerSession(): Promise<SessionVerifiee> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new ErreurApi("NONCONNECTE");

  const utilisatrice = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, householdId: true },
  });
  if (!utilisatrice) throw new ErreurApi("NONCONNECTE");

  return {
    userId: utilisatrice.id,
    role: utilisatrice.role,
    householdId: utilisatrice.householdId,
  };
}

/** Garde de rôle admin, côté serveur. Lève NONCONNECTE (401) ou INTERDIT (403). */
export async function exigerAdmin(): Promise<SessionVerifiee> {
  const session = await exigerSession();
  if (session.role !== "admin") throw new ErreurApi("INTERDIT");
  return session;
}
