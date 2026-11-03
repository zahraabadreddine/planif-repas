import Link from "next/link";
import { HandNote } from "@/components/main-levee";
import { UrgencyButton } from "@/components/bouton-urgence";
import { listeDuMenuActif } from "@/lib/courses/generation";
import { sessionDeLaPage } from "../foyer/commun";
import { PreparerListe, TicketCourses } from "./ticket-courses";

// Liste de courses du menu actif (EF-09, EF-10) : lue côté serveur, cochée côté client.

export default async function ShoppingPage() {
  const session = await sessionDeLaPage();
  const actif = await listeDuMenuActif(session);
  const peutModifier = session.acces !== "view";

  return (
    <div className="-mx-5 -mb-[190px] -mt-6 min-h-dvh bg-mangue px-5 pb-[190px] pt-[22px]">
      <header className="flex items-baseline gap-2.5">
        <h1 className="retro text-[30px] leading-[1.3]">Les courses</h1>
        <HandNote className="text-xl text-puce" tilt={-4}>
          pour toute la semaine
        </HandNote>
      </header>

      {!actif ? (
        <div className="paper-shadow mt-5 bg-[#FFFDF7] px-[18px] py-5 text-center">
          <p className="font-hand text-[23px] font-bold leading-tight text-puce">
            Valide ton menu pour obtenir ta liste
          </p>
          <Link
            href="/menu"
            className="press mt-4 inline-flex h-12 items-center rounded-[14px_18px_16px_12px] bg-foret px-5 text-sm font-extrabold text-creme"
          >
            Voir le menu
          </Link>
        </div>
      ) : actif.liste ? (
        <TicketCourses listeDeDepart={actif.liste} peutModifier={peutModifier} />
      ) : (
        <PreparerListe menuId={actif.menuId} peutModifier={peutModifier} />
      )}

      <UrgencyButton variant="round" />
    </div>
  );
}
