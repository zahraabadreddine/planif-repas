import { platsDuFoyer } from "@/lib/foyer/notes";
import { EnTeteSousPage, sessionDeLaPage } from "../commun";
import { NotesPlats } from "../notes-plats";

/** Notes de plats du foyer (EF-04). */
export default async function PlatsPage() {
  const session = await sessionDeLaPage();
  const plats = await platsDuFoyer(session);
  return (
    <>
      <EnTeteSousPage titre="Vos plats" lectureSeule={session.acces === "view"} />
      {/* Recréée quand la liste change : foyer créé, ou membre allergique ajouté */}
      <NotesPlats
        key={plats.map((p) => p.id).join()}
        plats={plats}
        aUnFoyer={session.householdId !== null}
        lectureSeule={session.acces === "view"}
      />
    </>
  );
}
