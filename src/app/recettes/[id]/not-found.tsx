import Link from "next/link";

/** Recette inexistante, ou pas encore validée par une cuisinière. */
export default function RecetteIntrouvable() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-creme px-6 text-center text-foret">
      <h1 className="retro text-[28px] leading-[1.3]">Recette introuvable</h1>
      <p className="font-semibold text-cacao">
        Cette recette n&apos;existe pas, ou elle est encore en cours de vérification.
      </p>
      <Link
        href="/recettes"
        className="press flex h-[58px] w-full max-w-xs items-center justify-center rounded-[18px_22px_20px_16px] bg-foret font-display text-xl font-semibold text-or shadow-[0_6px_0_#411102]"
      >
        Voir toutes les recettes
      </Link>
    </main>
  );
}
