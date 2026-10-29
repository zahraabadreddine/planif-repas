"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HandArrow, HandNote } from "@/components/main-levee";
import { CheckIcon, ShareIcon } from "@/components/icones";
import { MealCard } from "@/components/carte-repas";
import { ChoixRecette } from "@/components/choix-recette";
import { UrgencyButton } from "@/components/bouton-urgence";
import { cx, fcfa, whatsappLink } from "@/lib/format";
import { recipes, getRecipe, household, weekPlan as weekPlanInit } from "@/lib/donnees-simulees";
import type { MealSlot } from "@/lib/types";

type RepasCible = { dayIndex: number; mealIndex: number; slot: MealSlot; currentId: string };

function lundiDeLaSemaine(): string {
  const now = new Date();
  const jour = now.getUTCDay();
  const diff = jour === 0 ? -6 : 1 - jour;
  const lundi = new Date(now);
  lundi.setUTCDate(lundi.getUTCDate() + diff);
  return lundi.toISOString().slice(0, 10);
}

export default function MenuPage() {
  const router = useRouter();
  const todayIndex = Math.max(
    0,
    weekPlanInit.findIndex((d) => d.date === household.today),
  );
  const [selected, setSelected] = useState(todayIndex);
  const [plan, setPlan] = useState(weekPlanInit);
  const [cible, setCible] = useState<RepasCible | null>(null);
  const [validation, setValidation] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function validerMenu() {
    setValidation(true);
    setErreur(null);
    try {
      const genRes = await fetch("/api/meal-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: lundiDeLaSemaine() }),
      });
      if (!genRes.ok) {
        const body = await genRes.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Impossible de préparer le menu.");
      }
      const { plan: menuCree } = await genRes.json();

      const actRes = await fetch(`/api/meal-plans/${menuCree.id}/activate`, {
        method: "POST",
      });
      if (!actRes.ok) {
        const body = await actRes.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Impossible de valider le menu.");
      }

      router.push("/courses");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Une erreur est survenue.");
      setValidation(false);
    }
  }

  const day = plan[selected];
  const meals = day.meals.map((m) => ({ ...m, recipe: getRecipe(m.recipeId)! }));
  const dayTotal = meals.reduce((sum, m) => sum + m.recipe.costFcfa, 0);

  const shareText =
    `Menu de la semaine (${household.weekLabel})\n` +
    plan
      .map((d) => `${d.label} : ${d.meals.map((m) => getRecipe(m.recipeId)?.name).join(" / ")}`)
      .join("\n");

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h1 className="retro text-[30px] leading-[1.3]">La semaine</h1>
          <HandNote className="text-[21px] text-carmin" tilt={-4}>
            12 → 18 oct.
          </HandNote>
        </div>
        <a
          href={whatsappLink(shareText)}
          target="_blank"
          rel="noreferrer"
          aria-label="Partager le menu sur WhatsApp"
          className="press wonky flex h-[46px] w-[46px] shrink-0 items-center justify-center bg-palme text-creme"
        >
          <ShareIcon />
        </a>
      </header>

      <Link
        href="/recettes"
        className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-extrabold text-palme underline underline-offset-4"
      >
        Toutes les recettes →
      </Link>

      <p className="mt-2 text-[13px] font-bold text-cacao">
        Pour {household.members} · {household.restrictions.join(", ").toLowerCase()} ·{" "}
        {fcfa(household.spentFcfa, false)} F dépensés sur {fcfa(household.weeklyBudgetFcfa, false)}
      </p>

      <div
        role="tablist"
        aria-label="Jours de la semaine"
        className="mt-4 flex justify-between gap-0.5 border-b-2 border-dashed border-biscuit pb-2.5"
      >
        {plan.map((d, i) => {
          const active = i === selected;
          return (
            <button
              key={d.date}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(i)}
              className={cx(
                "press blob flex h-[58px] w-[46px] flex-col items-center justify-center gap-px transition-colors",
                active ? "bg-sirop text-puce" : "text-foret",
              )}
              style={{ transform: active ? `rotate(${i % 2 ? -5 : 4}deg)` : undefined }}
            >
              <span className="text-[11px] font-extrabold tracking-wide">{d.short}</span>
              <span className="font-display text-xl font-semibold leading-none">
                {d.date.slice(-2)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <h2 className="font-display text-[21px] font-semibold">{day.label}</h2>
        <span className="text-[13px] font-extrabold text-palme">
          {fcfa(dayTotal, false)} F la journée
        </span>
      </div>

      {/* key = jour : les cartes rejouent leur animation à chaque changement de jour */}
      <div key={day.date} className="mt-3.5 flex flex-col gap-3.5">
        {meals.map((m, i) => (
          <MealCard
            key={m.slot}
            recipe={m.recipe}
            slot={m.slot}
            tag={m.tag}
            delay={i * 90}
            onChanger={() =>
              setCible({ dayIndex: selected, mealIndex: i, slot: m.slot, currentId: m.recipeId })
            }
          />
        ))}
      </div>

      <div className="mt-[22px] flex items-start gap-1.5 pl-1.5">
        <HandArrow className="shrink-0 text-palme" />
        <HandNote as="p" className="text-xl leading-[1.1] text-palme" tilt={-1.5}>
          le riz de ce soir resservira jeudi, rien ne se perd
        </HandNote>
      </div>

      {erreur && (
        <p className="fixed bottom-[160px] left-[max(20px,calc(50%-195px))] z-40 rounded-xl bg-carmin px-4 py-2 text-xs font-bold text-creme">
          {erreur}
        </p>
      )}
      <button
        type="button"
        disabled={validation}
        onClick={validerMenu}
        className="press fixed bottom-[104px] left-[max(20px,calc(50%-195px))] z-40 flex h-[50px] items-center gap-2 rounded-[16px_20px_18px_14px] bg-palme px-[18px] text-sm font-extrabold text-creme disabled:opacity-60"
      >
        <CheckIcon size={18} strokeWidth={3} className="text-or" />
        {validation ? "Préparation…" : "C’est bon, on fait les courses"}
      </button>
      <UrgencyButton variant="round" />

      {cible && (
        <ChoixRecette
          slot={cible.slot}
          currentId={cible.currentId}
          recipes={recipes}
          onChoose={(recipeId) => {
            setPlan((prev) =>
              prev.map((d, di) =>
                di !== cible.dayIndex
                  ? d
                  : {
                      ...d,
                      meals: d.meals.map((m, mi) =>
                        mi !== cible.mealIndex ? m : { ...m, recipeId },
                      ),
                    },
              ),
            );
            setTimeout(() => setCible(null), 400);
          }}
          onClose={() => setCible(null)}
        />
      )}
    </>
  );
}
