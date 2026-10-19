import { redirect } from "next/navigation";
import { lirePartage } from "@/lib/foyer/invitations";
import { lireFoyer } from "@/lib/foyer/profil";
import { EnTeteSousPage, sessionDeLaPage } from "../commun";
import { PartageFoyerEcran } from "../partage-foyer";

/** Le foyer partagé : inviter, gérer les droits, quitter (EF-03). */
export default async function PartagePage() {
  const session = await sessionDeLaPage();
  const foyer = await lireFoyer(session);
  if (!foyer || !session.acces) redirect("/foyer");
  const partage = await lirePartage(session);
  return (
    <>
      <EnTeteSousPage titre="Le foyer partagé" />
      <PartageFoyerEcran nomFoyer={foyer.name} acces={session.acces} partage={partage} />
    </>
  );
}
