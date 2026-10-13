import { redirect } from "next/navigation";
import { exigerSession } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";

/**
 * Espace administratrice : la garde de rôle est faite côté serveur.
 * Le rôle est relu en base (pas dans le cookie) : un rôle retiré prend effet tout de suite.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await exigerSession().catch((erreur: unknown) => {
    if (erreur instanceof ErreurApi) return null;
    throw erreur;
  });
  if (!session) redirect("/connexion");
  if (session.role !== "admin") redirect("/accueil");

  return <main className="px-5 pb-10 pt-6">{children}</main>;
}
