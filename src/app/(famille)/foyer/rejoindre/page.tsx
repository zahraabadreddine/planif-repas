import { redirect } from "next/navigation";
import { EnTeteSousPage, sessionDeLaPage } from "../commun";
import { RejoindreFoyer } from "../rejoindre-foyer";

type Props = { searchParams: Promise<{ code?: string | string[] }> };

/** Rejoindre un foyer avec le code reçu (EF-03). Un compte qui a déjà un foyer est renvoyé au sommaire. */
export default async function RejoindrePage({ searchParams }: Props) {
  const session = await sessionDeLaPage();
  if (session.householdId) redirect("/foyer/partage");
  const { code } = await searchParams;
  return (
    <>
      <EnTeteSousPage titre="Rejoindre un foyer" />
      <RejoindreFoyer codeInitial={typeof code === "string" ? code.slice(0, 10) : ""} />
    </>
  );
}
