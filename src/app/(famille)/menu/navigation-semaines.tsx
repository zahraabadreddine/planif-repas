import Link from "next/link";
import { HandNote } from "@/components/main-levee";
import { ChevronLeft, ChevronRight } from "@/components/icones";
import { decalerSemaine, libelleSemaine } from "@/lib/planificateur/semaines";

// Parcourir le calendrier semaine par semaine, et revenir d'un geste à la semaine en cours.

type Props = { lundi: string; lundiDuJour: string };

const lienSemaine = (lundi: string, lundiDuJour: string) =>
  lundi === lundiDuJour ? "/menu" : `/menu?semaine=${lundi}`;

export function NavigationSemaines({ lundi, lundiDuJour }: Props) {
  const enCours = lundi === lundiDuJour;
  const fleche =
    "press blob flex h-11 w-11 shrink-0 items-center justify-center border-[2.5px] border-foret";
  return (
    <nav aria-label="Semaines du menu" className="mt-3">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={lienSemaine(decalerSemaine(lundi, -1), lundiDuJour)}
          aria-label="Semaine précédente"
          className={fleche}
        >
          <ChevronLeft />
        </Link>
        <p className="text-center font-display text-lg font-semibold" aria-live="polite">
          Semaine du {libelleSemaine(lundi)}
        </p>
        <Link
          href={lienSemaine(decalerSemaine(lundi, 1), lundiDuJour)}
          aria-label="Semaine suivante"
          className={fleche}
        >
          <ChevronRight />
        </Link>
      </div>
      <div className="mt-1 flex min-h-11 items-center justify-center">
        {enCours ? (
          <HandNote className="text-xl text-carmin" tilt={-3}>
            cette semaine
          </HandNote>
        ) : (
          <Link
            href="/menu"
            className="press inline-flex h-11 items-center rounded-[14px_18px_16px_12px] bg-or px-4 text-sm font-extrabold text-puce"
          >
            Revenir à cette semaine
          </Link>
        )}
      </div>
    </nav>
  );
}
