import Link from "next/link";
import { FridgeHero } from "@/components/FridgeHero";
import { ArrowRight } from "@/components/Icons";
import { UmamiLogo } from "@/components/Logo";

export default function WelcomePage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-mangue px-6 pb-8 pt-7 text-foret">
      {/* gribouillis décoratifs */}
      <svg className="absolute left-[26px] top-[120px] animate-wobble" width="46" height="40" viewBox="0 0 46 40" fill="none" stroke="#FFF4DF" strokeWidth={3} strokeLinecap="round" aria-hidden="true">
        <path d="M4 30c4-14 10-14 10-4s8 10 10-6 10-10 10 2" />
      </svg>
      <svg className="absolute right-7 top-24 animate-wobble [animation-delay:.8s]" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#FFF4DF" strokeWidth={3} strokeLinecap="round" aria-hidden="true">
        <path d="M8 10l4 10M20 6v12M32 10l-4 10" />
      </svg>

      <div className="flex w-full items-center justify-between">
        <UmamiLogo className="-my-3.5 -ml-1.5" />
        <Link href="/accueil" className="px-1 py-3 text-sm font-extrabold">
          Passer
        </Link>
      </div>

      <div className="relative mt-6">
        <FridgeHero />
        <p className="absolute -right-12 top-[306px] -rotate-6 text-center font-hand text-xl font-bold leading-none text-puce">
          ouvre-le
          <br />
          tous les jours
        </p>
        <svg className="absolute -right-4 top-[268px]" width="34" height="38" viewBox="0 0 34 38" fill="none" stroke="#411102" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true">
          <path d="M22 36C30 24 26 10 8 6" />
          <path d="M14 2L7 6l5 6" />
        </svg>
      </div>

      <h1 className="retro mt-[26px] animate-pop text-center text-4xl leading-[1.2]">
        On mange quoi
        <br />
        aujourd&apos;hui&nbsp;?
      </h1>
      <p className="mt-[18px] max-w-[300px] text-center text-base font-bold leading-snug text-puce">
        On décide ensemble, avec le temps que tu as, ton budget en FCFA et ce qu&apos;il reste dans la cuisine.
      </p>

      <div className="mt-auto flex w-full flex-col gap-2.5 pt-8">
        <Link
          href="/accueil"
          className="press flex h-[58px] items-center justify-center gap-2.5 rounded-[18px_22px_20px_16px] bg-foret font-display text-xl font-semibold text-or shadow-[0_6px_0_#411102]"
        >
          On commence <ArrowRight />
        </Link>
        <Link href="/accueil" className="p-3 text-center text-[15px] font-extrabold">
          J&apos;ai déjà un compte
        </Link>
      </div>
    </main>
  );
}
