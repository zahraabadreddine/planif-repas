import { redirect } from "next/navigation";
import { exigerSession } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { ChauffeurShell } from "./chauffeur-shell";

export default async function ChauffeurLayout({ children }: { children: React.ReactNode }) {
  const session = await exigerSession().catch((erreur: unknown) => {
    if (erreur instanceof ErreurApi) return null;
    throw erreur;
  });
  if (!session) redirect("/connexion");
  if (session.role !== "driver") redirect("/accueil");

  return <ChauffeurShell>{children}</ChauffeurShell>;
}
