import { redirect } from "next/navigation";
import { exigerSession } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { AdminShell } from "./admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await exigerSession().catch((erreur: unknown) => {
    if (erreur instanceof ErreurApi) return null;
    throw erreur;
  });
  if (!session) redirect("/connexion");
  if (session.role !== "admin") redirect("/accueil");

  return <AdminShell>{children}</AdminShell>;
}
