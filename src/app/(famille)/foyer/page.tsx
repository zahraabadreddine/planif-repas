import { redirect } from "next/navigation";
import { PageHeader } from "@/components/titre-page";
import { MonCompte } from "@/components/mon-compte";
import { exigerSession } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { lireFoyer } from "@/lib/foyer/profil";
import { ProfilFoyer } from "./profil-foyer";

/** Écran du foyer : profil du foyer (EF-03), puis le compte. */
export default async function FoyerPage() {
  const session = await exigerSession().catch((erreur: unknown) => {
    if (erreur instanceof ErreurApi) return null;
    throw erreur;
  });
  if (!session) redirect("/connexion");

  const foyer = await lireFoyer(session);

  return (
    <>
      <PageHeader overline="Mon foyer" title="Réglages" />
      <ProfilFoyer foyer={foyer} />
      <MonCompte />
    </>
  );
}
