import Link from "next/link";
import { HandNote } from "@/components/main-levee";
import { prisma } from "@/lib/db";
import { lireMenuCourant } from "@/lib/planificateur/generation";
import { sessionDeLaPage } from "../foyer/commun";
import { MenuInteractif } from "./menu-interactif";

// Page menu (EF-06) : lit le menu courant en base et le passe au composant interactif.

export default async function MenuPage() {
  const session = await sessionDeLaPage();
  const menu = await lireMenuCourant(session);

  if (!menu) {
    return (
      <div className="paper-shadow mt-5 bg-[#FFFDF7] px-[18px] py-5 text-center">
        <h1 className="retro text-[30px] leading-[1.3]">La semaine</h1>
        <p className="mt-4 font-hand text-[23px] font-bold leading-tight text-puce">
          Pas encore de menu cette semaine
        </p>
        <HandNote className="mt-2 text-xl text-cacao" tilt={-2}>
          Demande à l&apos;assistant de t&apos;en préparer un !
        </HandNote>
        <Link
          href="/chat"
          className="press mt-4 inline-flex h-12 items-center rounded-[14px_18px_16px_12px] bg-palme px-5 text-sm font-extrabold text-creme"
        >
          Ouvrir le chat
        </Link>
      </div>
    );
  }

  const foyer = await prisma.household.findUnique({
    where: { id: session.householdId! },
    select: { weeklyBudgetFcfa: true },
  });
  const peutModifier = session.acces !== "view";

  return (
    <MenuInteractif
      menu={menu}
      weeklyBudgetFcfa={foyer?.weeklyBudgetFcfa ?? 0}
      peutModifier={peutModifier}
    />
  );
}
