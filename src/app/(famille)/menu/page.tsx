import EtatVide from "@/components/etat-vide";
import TitrePage from "@/components/titre-page";

export const metadata = { title: "Menu · Planif Repas" };

export default function PageMenu() {
  return (
    <>
      <TitrePage>Menu de la semaine</TitrePage>
      <EtatVide
        titre="Pas encore de menu cette semaine"
        message="L'assistant pourra vous proposer un menu adapté à votre budget et à votre famille."
        action={{ href: "/chat", libelle: "Demander un menu" }}
      />
    </>
  );
}
