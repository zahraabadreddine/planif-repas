import { PageHeader } from "@/components/titre-page";
import { MonCompte } from "@/components/mon-compte";

/** Écran du foyer. Pour l'instant : le compte seulement ; le profil du foyer arrive avec EF-03. */
export default function FoyerPage() {
  return (
    <>
      <PageHeader overline="Mon foyer" title="Réglages" />
      <MonCompte />
    </>
  );
}
