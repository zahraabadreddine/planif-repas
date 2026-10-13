"use client";

import Link from "next/link";
import { useState } from "react";
import { HandArrow, HandNote, Squiggle } from "@/components/main-levee";
import { ChevronLeft, WhatsAppIcon } from "@/components/icones";
import { AttiekePlate, Plate } from "@/components/illustrations/assiette";
import { UrgencyButton } from "@/components/bouton-urgence";
import { cx, fcfa, whatsappLink } from "@/lib/format";
import type { Recipe } from "@/lib/types";

export function RecipeView({ recipe }: { recipe: Recipe }) {
  const [tab, setTab] = useState<"steps" | "ingredients">("steps");
  const [step, setStep] = useState(0);
  const current = recipe.steps[step];
  const last = step === recipe.steps.length - 1;

  const shareText =
    `${recipe.name} (${recipe.servings} pers., ${recipe.minutes} min)\n\nIngrédients :\n` +
    recipe.ingredients.map((g) => `• ${g.name} : ${g.quantity}`).join("\n") +
    `\n\nÉtapes :\n` +
    recipe.steps.map((s, i) => `${i + 1}. ${s.text}`).join("\n");

  return (
    <main className="relative min-h-dvh bg-palme text-foret">
      <section className="relative h-[300px] px-5 pt-[22px]">
        <div className="relative flex items-center justify-between">
          <Link href="/menu" aria-label="Retour au menu" className="-ml-2.5 flex h-11 w-11 items-center justify-center text-creme">
            <ChevronLeft size={24} strokeWidth={3} />
          </Link>
          <div className="flex items-center gap-2">
            <a
              href={whatsappLink(shareText)}
              target="_blank"
              rel="noreferrer"
              className="press flex h-11 items-center gap-1.5 rounded-[14px_18px_16px_12px] bg-or px-3.5 text-sm font-extrabold"
            >
              <WhatsAppIcon size={18} /> Envoyer
            </a>
            <UrgencyButton variant="square" />
          </div>
        </div>
        <div className="absolute left-1/2 top-11 -ml-[90px] animate-float">
          {recipe.id === "attieke-poisson" ? <AttiekePlate /> : <Plate colors={recipe.colors} size={180} steam />}
        </div>
        <HandNote as="p" className="absolute left-[22px] top-[150px] text-[21px] text-or" tilt={-8}>
          ça sent bon
          <br />
          déjà&nbsp;!
        </HandNote>
        <HandArrow className="absolute left-[66px] top-[196px] text-or" />
      </section>

      <section className="relative -mt-[30px] min-h-[calc(100dvh-270px)] rounded-[30px_36px_0_0] bg-creme px-5 pb-10 pt-[22px]">
        <h1 className="retro text-[27px] leading-[1.3]">{recipe.name}</h1>
        <p className="mt-1.5 text-sm font-bold text-cacao">
          {recipe.minutes} min · pour {recipe.servings} · environ {fcfa(recipe.costFcfa, false)} F · {recipe.difficulty.toLowerCase()}
        </p>

        <div role="tablist" aria-label="Recette" className="mt-3.5 flex gap-[22px]">
          {(
            [
              ["ingredients", "Ingrédients"],
              ["steps", "Étapes"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cx("relative h-11 font-display text-lg font-semibold", tab === key ? "text-foret" : "text-cacao")}
            >
              {label}
              {tab === key && <Squiggle width={100} color="#F47230" animated className="absolute bottom-0.5 left-0 w-full" />}
            </button>
          ))}
        </div>

        {tab === "steps" ? (
          <div className="mt-2.5">
            <div className="flex gap-1.5" aria-label={`Étape ${step + 1} sur ${recipe.steps.length}`}>
              {recipe.steps.map((_, k) => (
                <span key={k} className={cx("h-1.5 flex-1 rounded-[4px_6px_3px_5px] transition-colors", k <= step ? "bg-sirop" : "bg-sable")} />
              ))}
            </div>

            <div key={step} className="mt-4 min-h-[196px] animate-slide-in rounded-[22px_28px_24px_20px] bg-white px-[18px] pb-[18px] pt-4">
              <div className="flex items-baseline justify-between">
                <span className="font-hand text-[54px] font-bold leading-[0.9] text-sirop">{step + 1}</span>
                <span className="font-hand text-xl font-bold text-cacao">{current.minutes} min</span>
              </div>
              <p className="mt-2 text-lg font-bold leading-relaxed">{current.text}</p>
            </div>

            <div className="mt-4 flex items-center gap-2.5">
              <button
                type="button"
                aria-label="Étape précédente"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="press blob flex h-14 w-14 items-center justify-center border-[2.5px] border-foret disabled:opacity-40"
              >
                <ChevronLeft />
              </button>
              {last ? (
                <Link
                  href="/accueil"
                  className="press flex h-14 flex-1 items-center justify-center rounded-[18px_22px_20px_16px] bg-foret font-display text-lg font-semibold text-or shadow-[0_5px_0_#9F350B]"
                >
                  Bon appétit&nbsp;!
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="press h-14 flex-1 rounded-[18px_22px_20px_16px] bg-foret font-display text-lg font-semibold text-or shadow-[0_5px_0_#9F350B]"
                >
                  Étape suivante
                </button>
              )}
            </div>
          </div>
        ) : (
          <ul className="mt-2">
            {recipe.ingredients.map((g, i) => (
              <li
                key={g.name}
                className="flex h-11 animate-slide-up items-center gap-2.5 border-b-2 border-dotted border-biscuit"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="flex-1 text-[15px] font-extrabold">{g.name}</span>
                <span className="text-sm font-bold text-cacao">{g.quantity}</span>
                <span className={cx("w-[84px] text-right font-hand text-[19px] font-bold", g.inStock ? "text-palme" : "text-carmin")}>
                  {g.inStock ? "dans le frigo" : "à acheter"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
