import { MonCompte } from "@/components/mon-compte";
import { EnTeteSousPage, sessionDeLaPage } from "../commun";

/** Compte : changer son mot de passe et se déconnecter (EF-01). */
export default async function ComptePage() {
  await sessionDeLaPage();
  return (
    <>
      <EnTeteSousPage titre="Mon compte" />
      <MonCompte />
    </>
  );
}
