import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "@/components/icones";
import { exigerSession, type SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";

// Éléments partagés par le sommaire « Mon foyer » et ses sous-pages.

/** Session de la page, ou retour à la connexion si elle n'est plus valable. */
export async function sessionDeLaPage(): Promise<SessionVerifiee> {
  const session = await exigerSession().catch((erreur: unknown) => {
    if (erreur instanceof ErreurApi) return null;
    throw erreur;
  });
  if (!session) redirect("/connexion");
  return session;
}

/** En-tête d'une sous-page : retour au sommaire « Mon foyer », puis le titre. */
export function EnTeteSousPage({
  titre,
  lectureSeule = false,
}: {
  titre: string;
  lectureSeule?: boolean;
}) {
  return (
    <header>
      <Link
        href="/foyer"
        className="-ml-2 inline-flex h-11 items-center gap-1 pr-3 text-sm font-extrabold text-cacao"
      >
        <ChevronLeft size={20} strokeWidth={2.8} /> Mon foyer
      </Link>
      <h1 className="retro text-[28px] leading-[1.3]">{titre}</h1>
      {lectureSeule && (
        <p className="mt-2 rounded-[16px_12px_18px_14px] bg-lagon/40 px-4 py-2.5 text-sm font-bold text-foret">
          Tu peux seulement voir ce foyer : seule la personne qui l&apos;a créé peut te permettre de
          le modifier.
        </p>
      )}
    </header>
  );
}
