"use client";

import Link from "next/link";
import { useState } from "react";
import { HandArrow, HandNote, Squiggle } from "@/components/main-levee";
import { ChevronLeft, WhatsAppIcon } from "@/components/icones";
import { AttiekePlate, Plate } from "@/components/illustrations/assiette";
import { UrgencyButton } from "@/components/bouton-urgence";
import type { RecetteDetail } from "@/lib/catalogue/recettes";
import { cx, fcfa, whatsappLink } from "@/lib/format";

/** Couleurs de l'assiette dessinée, selon l'origine de la recette. */
const ASSIETTES: Record<string, { base: string; top: string }> = {
  ivoirienne: { base: "#FFF4DF", top: "#F47230" },
  libanaise: { base: "#F3DDB8", top: "#344F30" },
  française: { base: "#F3C98B", top: "#9F350B" },
  marocaine: { base: "#F3C98B", top: "#F9A11B" },
  tunisienne: { base: "#FFF4DF", top: "#E2492F" },
  italienne: { base: "#F3DDB8", top: "#E2492F" },
  chinoise: { base: "#FFF4DF", top: "#FDD973" },
  indienne: { base: "#FFF4DF", top: "#F9A11B" },
};

function texteDuCout(recette: RecetteDetail): string {
  const { avecReleve, avecEstimation } = recette.cout;
  const estimes = `estimé${avecEstimation > 1 ? "s" : ""}`;
  const parties = [
    avecReleve > 0 && `${avecReleve} prix relevé${avecReleve > 1 ? "s" : ""} au marché`,
    avecEstimation > 0 &&
      (avecReleve > 0 ? `${avecEstimation} ${estimes}` : `${avecEstimation} prix ${estimes}`),
  ].filter(Boolean);
  return parties.length > 0 ? parties.join(", ") : "aucun prix connu pour l'instant";
}

export function RecipeView({ recipe }: { recipe: RecetteDetail }) {
  const [tab, setTab] = useState<"steps" | "ingredients">("steps");
  const [step, setStep] = useState(0);
  const current = recipe.etapes[step];
  const last = step === recipe.etapes.length - 1;
  const { cout } = recipe;

  const shareText =
    `${recipe.title} (${recipe.servings} pers., ${recipe.minutes} min)\n\nIngrédients :\n` +
    recipe.ingredientsFiche
      .map((g) => `• ${g.nom} : ${g.quantite}${g.optional ? " (facultatif)" : ""}`)
      .join("\n") +
    `\n\nÉtapes :\n` +
    recipe.etapes.map((s, i) => `${i + 1}. ${s.text}`).join("\n");

  return (
    <main className="relative min-h-dvh bg-palme text-foret">
      <section className="relative h-[300px] px-5 pt-[22px]">
        <div className="relative flex items-center justify-between">
          <Link
            href="/recettes"
            aria-label="Retour aux recettes"
            className="-ml-2.5 flex h-11 w-11 items-center justify-center text-creme"
          >
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
          {/^(attiéké|garba)/i.test(recipe.title) ? (
            <AttiekePlate />
          ) : (
            <Plate colors={ASSIETTES[recipe.cuisine] ?? ASSIETTES.ivoirienne} size={180} steam />
          )}
        </div>
        <HandNote as="p" className="absolute left-[22px] top-[150px] text-[21px] text-or" tilt={-8}>
          ça sent bon
          <br />
          déjà&nbsp;!
        </HandNote>
        <HandArrow className="absolute left-[66px] top-[196px] text-or" />
      </section>

      <section className="relative -mt-[30px] min-h-[calc(100dvh-270px)] rounded-[30px_36px_0_0] bg-creme px-5 pb-10 pt-[22px]">
        <h1 className="retro text-[27px] leading-[1.3]">{recipe.title}</h1>
        <p className="mt-1.5 text-sm font-bold text-cacao">
          {recipe.cuisine} · {recipe.minutes} min · pour {recipe.servings} ·{" "}
          {recipe.difficulte.toLowerCase()}
        </p>

        <div className="mt-3 rounded-[16px_12px_18px_14px] bg-sable/60 px-3.5 py-2.5">
          <p className="font-extrabold text-foret">
            ≈ {fcfa(cout.totalFcfa)}{" "}
            <span className="text-sm text-cacao">pour {recipe.servings} personnes</span>
          </p>
          <p className="text-[13px] font-bold text-cacao">
            Coût estimé : {texteDuCout(recipe)}.
            {cout.sansPrix.length > 0 && ` Prix pas encore relevé : ${cout.sansPrix.join(", ")}.`}
          </p>
        </div>

        {recipe.incompatibilites.length > 0 && (
          <p
            role="alert"
            className="mt-3 rounded-[16px_12px_18px_14px] border-[2.5px] border-carmin bg-rose/40 px-3.5 py-2.5 text-sm font-bold text-carmin"
          >
            Ne convient pas à ton foyer :{" "}
            {recipe.incompatibilites.map((i) => `${i.raison} (${i.membre})`).join(", ")}.
          </p>
        )}

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
              className={cx(
                "relative h-11 font-display text-lg font-semibold",
                tab === key ? "text-foret" : "text-cacao",
              )}
            >
              {label}
              {tab === key && (
                <Squiggle
                  width={100}
                  color="#F47230"
                  animated
                  className="absolute bottom-0.5 left-0 w-full"
                />
              )}
            </button>
          ))}
        </div>

        {tab === "steps" ? (
          current ? (
            <div className="mt-2.5">
              <div
                className="flex gap-1.5"
                aria-label={`Étape ${step + 1} sur ${recipe.etapes.length}`}
              >
                {recipe.etapes.map((etape, k) => (
                  <span
                    key={`${k}-${etape.minutes}`}
                    className={cx(
                      "h-1.5 flex-1 rounded-[4px_6px_3px_5px] transition-colors",
                      k <= step ? "bg-sirop" : "bg-sable",
                    )}
                  />
                ))}
              </div>

              <div
                key={step}
                className="mt-4 min-h-[196px] animate-slide-in rounded-[22px_28px_24px_20px] bg-white px-[18px] pb-[18px] pt-4"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-hand text-[54px] font-bold leading-[0.9] text-sirop">
                    {step + 1}
                  </span>
                  <span className="font-hand text-xl font-bold text-cacao">
                    {current.minutes} min
                  </span>
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
            <p className="mt-3 text-sm font-semibold text-cacao">
              Les étapes de cette recette ne sont pas encore disponibles.
            </p>
          )
        ) : (
          <ul className="mt-2">
            {recipe.ingredientsFiche.map((g, i) => (
              <li
                key={`${g.nom}-${i}`}
                className="flex min-h-11 animate-slide-up items-center gap-2.5 border-b-2 border-dotted border-biscuit py-1.5"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span className="flex-1 text-[15px] font-extrabold">{g.nom}</span>
                <span className="text-right text-sm font-bold text-cacao">{g.quantite}</span>
                {g.optional && (
                  <span className="font-hand text-[17px] font-bold text-palme">facultatif</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {recipe.idees.length > 0 && (
          <div className="mt-6">
            <h2 className="font-display text-lg font-semibold">Avec les restes</h2>
            <ul className="mt-1 list-disc pl-5 text-sm font-semibold text-cacao">
              {recipe.idees.map((idee) => (
                <li key={idee}>{idee}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
