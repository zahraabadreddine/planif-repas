import { redirect } from "next/navigation";
import { PageHeader } from "@/components/titre-page";
import { MonCompte } from "@/components/mon-compte";
import { exigerSession } from "@/lib/auth/garde";
import { nomsIngredients } from "@/lib/catalogue/ingredients";
import { ErreurApi } from "@/lib/erreurs";
import { aConsentiSante } from "@/lib/foyer/consentement";
import { listerMembres } from "@/lib/foyer/membres";
import { lireFoyer } from "@/lib/foyer/profil";
import { MembresFoyer } from "./membres-foyer";
import { ProfilFoyer } from "./profil-foyer";

/** Écran du foyer : profil du foyer et membres (EF-03), puis le compte. */
export default async function FoyerPage() {
  const session = await exigerSession().catch((erreur: unknown) => {
    if (erreur instanceof ErreurApi) return null;
    throw erreur;
  });
  if (!session) redirect("/connexion");

  const [foyer, membres, consentSante, ingredients] = await Promise.all([
    lireFoyer(session),
    listerMembres(session),
    aConsentiSante(session),
    nomsIngredients(),
  ]);

  return (
    <>
      <PageHeader overline="Mon foyer" title="Réglages" />
      <ProfilFoyer foyer={foyer} />
      <MembresFoyer
        membres={membres}
        aUnFoyer={foyer !== null}
        consentSante={consentSante}
        ingredients={ingredients}
      />
      <MonCompte />
    </>
  );
}
