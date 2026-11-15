import Link from "next/link";
import { HandNote } from "@/components/main-levee";
import { prisma } from "@/lib/db";
import { lireMenuDeLaSemaine } from "@/lib/planificateur/generation";
import {
  dateValide,
  lundiCourant,
  lundiDe,
  lundiEnToutesLettres,
} from "@/lib/planificateur/semaines";
import { sessionDeLaPage } from "../foyer/commun";
import { MenuInteractif } from "./menu-interactif";
import { NavigationSemaines } from "./navigation-semaines";

// Page menu (EF-06) : le calendrier se parcourt semaine par semaine (/menu?semaine=AAAA-MM-JJ).
// Le foyer vient toujours de la session : la date choisie ne donne accès qu'aux menus du foyer.

type Props = { searchParams: Promise<{ semaine?: string | string[] }> };

/** La semaine demandée, ramenée à son lundi ; la semaine en cours si la date n'est pas valide. */
function semaineDemandee(valeur: string | string[] | undefined, lundiDuJour: string): string {
  const texte = Array.isArray(valeur) ? valeur[0] : valeur;
  return texte && dateValide(texte) ? lundiDe(texte) : lundiDuJour;
}

export default async function MenuPage({ searchParams }: Props) {
  const session = await sessionDeLaPage();
  const lundiDuJour = lundiCourant();
  const lundi = semaineDemandee((await searchParams).semaine, lundiDuJour);
  const passee = lundi < lundiDuJour;
  const menu = await lireMenuDeLaSemaine(session, lundi);
  const navigation = <NavigationSemaines lundi={lundi} lundiDuJour={lundiDuJour} />;

  if (!menu) {
    const demande = `Prépare-moi le menu de la semaine du ${lundiEnToutesLettres(lundi)}.`;
    return (
      <>
        <h1 className="retro text-[30px] leading-[1.3]">La semaine</h1>
        {navigation}
        <div className="paper-shadow mt-4 bg-[#FFFDF7] px-[18px] py-5 text-center">
          <p className="font-hand text-[23px] font-bold leading-tight text-puce">
            {passee ? "Pas de menu cette semaine-là" : "Pas encore de menu pour cette semaine"}
          </p>
          {!passee && session.acces !== "view" && (
            <>
              <HandNote className="mt-2 text-xl text-cacao" tilt={-2}>
                Umi peut t&apos;en préparer un !
              </HandNote>
              <Link
                href={`/chat?message=${encodeURIComponent(demande)}`}
                className="press mt-4 inline-flex h-12 items-center rounded-[14px_18px_16px_12px] bg-palme px-5 text-sm font-extrabold text-creme"
              >
                Demander à Umi
              </Link>
            </>
          )}
        </div>
      </>
    );
  }

  const foyer = await prisma.household.findUnique({
    where: { id: session.householdId! },
    select: { weeklyBudgetFcfa: true },
  });
  const peutEcrire = session.acces !== "view";

  return (
    <MenuInteractif
      // Une autre semaine repart de son premier jour
      key={menu.id}
      menu={menu}
      weeklyBudgetFcfa={foyer?.weeklyBudgetFcfa ?? 0}
      // Une semaine passée est un souvenir : on ne change plus ses repas
      peutModifier={peutEcrire && !passee}
      peutCuisiner={peutEcrire}
      passee={passee}
      navigation={navigation}
    />
  );
}
