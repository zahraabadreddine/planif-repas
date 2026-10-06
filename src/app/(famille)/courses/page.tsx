import EtatVide from "@/components/etat-vide";
import TitrePage from "@/components/titre-page";

export const metadata = { title: "Courses · Planif Repas" };

export default function PageCourses() {
  return (
    <>
      <TitrePage>Liste de courses</TitrePage>
      <EtatVide
        titre="Pas encore de liste"
        message="La liste sera préparée à partir du menu de la semaine, avec le coût estimé en FCFA."
        action={{ href: "/menu", libelle: "Voir le menu" }}
      />
    </>
  );
}
