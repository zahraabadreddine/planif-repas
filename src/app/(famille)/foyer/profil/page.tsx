import { redirect } from "next/navigation";
import { lireFoyer } from "@/lib/foyer/profil";
import { EnTeteSousPage, sessionDeLaPage } from "../commun";
import { ProfilFoyer } from "../profil-foyer";

/** Profil du foyer : nom, budget, cuisines, jour des courses (EF-03). */
export default async function ProfilPage() {
  const session = await sessionDeLaPage();
  const foyer = await lireFoyer(session);
  // Sans foyer, le formulaire de création est sur le sommaire.
  if (!foyer) redirect("/foyer");
  return (
    <>
      <EnTeteSousPage titre="Le foyer" lectureSeule={session.acces === "view"} />
      <ProfilFoyer foyer={foyer} lectureSeule={session.acces === "view"} />
    </>
  );
}
