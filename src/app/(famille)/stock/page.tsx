import EtatVide from "@/components/etat-vide";
import TitrePage from "@/components/titre-page";

export const metadata = { title: "Stock · Planif Repas" };

export default function PageStock() {
  return (
    <>
      <TitrePage>Stock</TitrePage>
      <EtatVide
        titre="Votre stock est vide"
        message="Déclarez vos achats pour savoir ce qu'il reste dans la cuisine."
        action={{ href: "/chat", libelle: "Déclarer des achats" }}
      />
    </>
  );
}
