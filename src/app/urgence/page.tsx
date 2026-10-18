"use client";

import Link from "next/link";
import { useState } from "react";
import { HandNote } from "@/components/main-levee";
import { CloseIcon, MinusIcon, PlusIcon } from "@/components/icones";
import { RunningClock } from "@/components/illustrations/personnages";
import { UmiHead } from "@/components/umi";
import { cx } from "@/lib/format";
import { emergencyOptions, household } from "@/lib/donnees-simulees";

const TIMES = [10, 15, 20, 30];
const CHIP_RADII = [
  "14px 18px 16px 12px",
  "18px 12px 14px 16px",
  "12px 16px 18px 14px",
  "16px 14px 12px 18px",
];

/** Cercle tracé au stylo autour du numéro choisi */
function HandCircle() {
  return (
    <svg
      className="absolute -left-1 -top-0.5"
      width="44"
      height="40"
      viewBox="0 0 44 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        className="drawn animate-tick"
        d="M30 6C18 0 4 8 5 20s14 18 26 14 12-18 2-28c-4-3-9-3-12-1"
        stroke="#9F350B"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function EmergencyPage() {
  const [minutes, setMinutes] = useState(15);
  const [people, setPeople] = useState(household.members);
  const [picked, setPicked] = useState(0);

  // Plus tard : POST /api/emergency → Umi renvoie 2 ou 3 options classées par rapidité
  const options = emergencyOptions
    .filter((o) => o.minutes <= minutes)
    .sort((a, b) => a.minutes - b.minutes);
  const choice = options[Math.min(picked, options.length - 1)];

  return (
    <main className="relative min-h-dvh bg-sirop text-foret">
      <section className="relative h-[318px] px-5 pt-[22px]">
        <div className="flex items-center justify-between">
          <Link
            href="/accueil"
            aria-label="Fermer"
            className="-ml-2.5 flex h-11 w-11 items-center justify-center"
          >
            <CloseIcon size={24} strokeWidth={3} />
          </Link>
          <span className="flex items-center gap-1">
            <HandNote className="text-[21px] text-puce" tilt={3}>
              Umi s&apos;en occupe
            </HandNote>
            <UmiHead size={40} mood="urgence" />
          </span>
        </div>

        <RunningClock className="absolute right-[18px] top-[74px] animate-wobble" />

        <h1 className="retro mt-3.5 max-w-[220px] text-[40px] leading-[1.15]">
          Pas le temps&nbsp;?
        </h1>
        <p className="mt-2.5 max-w-[200px] text-[15px] font-extrabold leading-snug text-puce">
          Dis-moi combien de minutes tu as. Je regarde ce qu&apos;il y a.
        </p>

        <div className="mt-4 flex items-center gap-1.5">
          <div role="radiogroup" aria-label="Temps disponible" className="flex gap-1.5">
            {TIMES.map((t, i) => {
              const active = t === minutes;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${t} minutes`}
                  onClick={() => {
                    setMinutes(t);
                    setPicked(0);
                  }}
                  className={cx(
                    "press flex h-[50px] w-[52px] flex-col items-center justify-center font-display leading-none transition-colors",
                    active ? "-rotate-[4deg] bg-foret text-or" : "bg-creme",
                  )}
                  style={{ borderRadius: CHIP_RADII[i] }}
                >
                  <span className="text-[19px] font-semibold">{t}</span>
                  <span className="text-[11px] font-medium">min</span>
                </button>
              );
            })}
          </div>
          <div className="ml-auto flex h-[50px] items-center rounded-[14px_18px_16px_12px] bg-creme px-0.5">
            <button
              type="button"
              aria-label="Une personne de moins"
              onClick={() => setPeople((p) => Math.max(1, p - 1))}
              className="flex h-10 w-[30px] items-center justify-center"
            >
              <MinusIcon size={16} strokeWidth={3} />
            </button>
            <span className="text-center leading-none" aria-live="polite">
              <span className="block font-display text-lg font-semibold">{people}</span>
              <span className="text-[10px] font-extrabold">pers.</span>
            </span>
            <button
              type="button"
              aria-label="Une personne de plus"
              onClick={() => setPeople((p) => Math.min(12, p + 1))}
              className="flex h-10 w-[30px] items-center justify-center"
            >
              <PlusIcon size={16} strokeWidth={3} />
            </button>
          </div>
        </div>
      </section>

      <section className="relative min-h-[calc(100dvh-318px)] rounded-[34px_28px_0_0] bg-creme px-5 pb-[160px] pt-[22px]">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[21px] font-semibold">Avec ce que tu as</h2>
          <HandNote className="text-lg text-palme" tilt={0}>
            sans arachide, promis
          </HandNote>
        </div>

        <div key={minutes} className="mt-3 flex flex-col gap-1">
          {options.map((o, i) => {
            const active = o === choice;
            return (
              <button
                key={o.recipeId}
                type="button"
                aria-pressed={active}
                onClick={() => setPicked(i)}
                className={cx(
                  "press wonky flex w-full animate-slide-up items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  active ? "-rotate-[0.8deg] bg-or" : "bg-transparent",
                )}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center font-hand text-[28px] font-bold text-carmin">
                  {i + 1}
                  {active && <HandCircle />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-[17px] font-semibold leading-tight">
                    {o.name}
                  </span>
                  <span className="mt-0.5 block text-[13px] font-bold text-cacao">
                    pour {people} · {o.uses}
                  </span>
                </span>
                <span className="shrink-0 font-display text-[15px] font-semibold">
                  {o.minutes} min
                </span>
              </button>
            );
          })}
        </div>

        {options.length < 3 && (
          <HandNote as="p" className="ml-3 mt-2.5 text-[19px] text-cacao" tilt={0}>
            en {minutes} minutes, il n&apos;y a que ça. Ajoute 5 minutes&nbsp;?
          </HandNote>
        )}

        <div className="fixed bottom-7 left-1/2 flex w-[calc(100%-40px)] max-w-[390px] -translate-x-1/2 flex-col gap-1.5">
          <p className="text-center text-[13px] font-bold text-cacao">
            La sauce graine de ce soir passe à demain.
          </p>
          <Link
            href="/recettes"
            className="press flex h-[58px] items-center justify-center rounded-[18px_22px_20px_16px] bg-foret font-display text-lg font-semibold text-or shadow-[0_5px_0_#9F350B]"
          >
            On part sur {choice.short}
          </Link>
          <Link href="/chat" className="p-2.5 text-center text-sm font-extrabold text-foret">
            Rien ne te tente&nbsp;? Un garba ou un alloco à côté, ça marche aussi.
          </Link>
        </div>
      </section>
    </main>
  );
}
