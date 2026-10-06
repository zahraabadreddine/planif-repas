import EtatVide from "@/components/etat-vide";
import TitrePage from "@/components/titre-page";

export const metadata = { title: "Chat · Planif Repas" };

export default async function PageChat({ searchParams }: PageProps<"/chat">) {
  const { mode } = await searchParams;
  const urgence = mode === "urgence";

  return (
    <>
      <TitrePage>{urgence ? "Pas le temps" : "Chat"}</TitrePage>
      <EtatVide
        titre={urgence ? "Mode urgence" : "Discutez avec l'assistant"}
        message={
          urgence
            ? "Bientôt : dites combien de minutes vous avez, l'assistant proposera 2 ou 3 plats faisables avec ce qu'il y a dans la cuisine."
            : "Bientôt : demandez un menu, déclarez vos achats ou dites ce que vous voulez manger."
        }
      />
    </>
  );
}
