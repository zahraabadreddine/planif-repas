import EtatVide from "@/components/etat-vide";
import TitrePage from "@/components/titre-page";

export const metadata = { title: "Accueil · Planif Repas" };

export default function PageAccueil() {
  return (
    <>
      <TitrePage>Accueil</TitrePage>
      <EtatVide
        titre="Bienvenue"
        message="Ici s'afficheront les produits à utiliser vite et le repas du jour."
        action={{ href: "/chat", libelle: "Parler à l'assistant" }}
      />
    </>
  );
}
