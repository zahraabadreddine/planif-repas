import { nomsIngredients } from "@/lib/catalogue/ingredients";
import { aConsentiSante } from "@/lib/foyer/consentement";
import { listerMembres } from "@/lib/foyer/membres";
import { EnTeteSousPage, sessionDeLaPage } from "../commun";
import { MembresFoyer } from "../membres-foyer";

/** Membres du foyer : surnom, âge, allergies et régimes (EF-03). */
export default async function MembresPage() {
  const session = await sessionDeLaPage();
  const [membres, consentSante, ingredients] = await Promise.all([
    listerMembres(session),
    aConsentiSante(session),
    nomsIngredients(),
  ]);
  return (
    <>
      <EnTeteSousPage titre="Les membres" />
      <MembresFoyer
        membres={membres}
        aUnFoyer={session.householdId !== null}
        consentSante={consentSante}
        ingredients={ingredients}
      />
    </>
  );
}
