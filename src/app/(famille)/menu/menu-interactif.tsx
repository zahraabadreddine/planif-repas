"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HandArrow, HandNote } from "@/components/main-levee";
import { CheckIcon, ShareIcon } from "@/components/icones";
import { MealCard } from "@/components/carte-repas";
import { ChoixRecette } from "@/components/choix-recette";
import { cx, fcfa, whatsappLink } from "@/lib/format";
import { couleursAssiette } from "@/lib/couleurs-assiette";
import type { MenuEnregistre, RepasEnregistre } from "@/lib/planificateur/generation";
import type { MealSlot, Recipe } from "@/lib/types";

// Menu interactif (EF-06) : affiche le menu réel, permet de changer les recettes.

type Props = {
  menu: MenuEnregistre;
  weeklyBudgetFcfa: number;
  peutModifier: boolean;
};

type JourDuMenu = {
  date: string;
  short: string;
  label: string;
  meals: (RepasEnregistre & { recipe: RepasEnregistre["recipe"] })[];
};

type SlotUI = MealSlot;
type RepasCible = { mealId: string; slot: SlotUI; currentId: string };

const JOURS_COURTS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];
const JOURS_LONGS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MOIS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function labelSemaine(weekStart: string): string {
  const debut = new Date(weekStart + "T00:00:00Z");
  const fin = new Date(debut);
  fin.setUTCDate(fin.getUTCDate() + 6);
  const dj = debut.getUTCDate();
  const fj = fin.getUTCDate();
  const dm = MOIS[debut.getUTCMonth()];
  const fm = MOIS[fin.getUTCMonth()];
  if (dm === fm) return `${dj} → ${fj} ${fm}`;
  return `${dj} ${dm} → ${fj} ${fm}`;
}

function jourDuMenu(date: string): { short: string; label: string } {
  const d = new Date(date + "T00:00:00Z");
  const jour = (d.getUTCDay() + 6) % 7;
  return {
    short: JOURS_COURTS[jour],
    label: `${JOURS_LONGS[jour]} ${d.getUTCDate()} ${MOIS[d.getUTCMonth()]}`,
  };
}

function grouperParJour(meals: RepasEnregistre[]): JourDuMenu[] {
  const parDate = new Map<string, RepasEnregistre[]>();
  for (const repas of meals) {
    const liste = parDate.get(repas.date) ?? [];
    liste.push(repas);
    parDate.set(repas.date, liste);
  }
  const jours: JourDuMenu[] = [];
  for (const [date, repas] of parDate) {
    const { short, label } = jourDuMenu(date);
    jours.push({ date, short, label, meals: repas });
  }
  jours.sort((a, b) => a.date.localeCompare(b.date));
  return jours;
}

function versRecetteUI(repas: RepasEnregistre): Recipe {
  return {
    id: repas.recipe.id,
    name: repas.recipe.title,
    minutes: repas.recipe.minutes,
    servings: repas.servings,
    costFcfa: repas.recipe.coutFcfa,
    difficulty: "Facile",
    colors: couleursAssiette(repas.recipe.id),
    ingredients: [],
    steps: [],
  };
}

function aujourdhui(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MenuInteractif({ menu, weeklyBudgetFcfa, peutModifier }: Props) {
  const router = useRouter();
  const jours = grouperParJour(menu.meals);
  const today = aujourdhui();
  const todayIndex = Math.max(
    0,
    jours.findIndex((j) => j.date >= today),
  );
  const [selected, setSelected] = useState(todayIndex);
  const [cible, setCible] = useState<RepasCible | null>(null);
  const [alternatives, setAlternatives] = useState<Recipe[]>([]);
  const [chargement, setChargement] = useState(false);
  const [activation, setActivation] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const estBrouillon = menu.status === "draft";
  const day = jours[selected];
  if (!day) return null;

  const dayTotal = day.meals.reduce((sum, m) => sum + m.recipe.coutFcfa, 0);

  const shareText =
    `Menu de la semaine (${labelSemaine(menu.weekStart)})\n` +
    jours.map((j) => `${j.label} : ${j.meals.map((m) => m.recipe.title).join(" / ")}`).join("\n");

  async function ouvrirChoix(repas: RepasEnregistre) {
    setCible({ mealId: repas.id, slot: repas.slot as SlotUI, currentId: repas.recipe.id });
    setChargement(true);
    try {
      const res = await fetch("/api/recipes");
      if (!res.ok) throw new Error("Impossible de charger les recettes.");
      const data = await res.json();
      const recettes = data.recipes as {
        id: string;
        title: string;
        minutes: number;
        servings: number;
        cout: { totalFcfa: number };
      }[];
      setAlternatives(
        recettes.map((r) => ({
          id: r.id,
          name: r.title,
          minutes: r.minutes,
          servings: r.servings,
          costFcfa: r.cout.totalFcfa,
          difficulty: "Facile" as const,
          colors: couleursAssiette(r.id),
          ingredients: [],
          steps: [],
        })),
      );
    } catch {
      setErreur("Impossible de charger les recettes.");
      setCible(null);
    } finally {
      setChargement(false);
    }
  }

  async function choisirRecette(recipeId: string) {
    if (!cible) return;
    try {
      const res = await fetch(`/api/planned-meals/${cible.mealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Impossible de changer la recette.");
      }
      setTimeout(() => {
        setCible(null);
        router.refresh();
      }, 400);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Une erreur est survenue.");
      setCible(null);
    }
  }

  async function activerMenu() {
    setActivation(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/meal-plans/${menu.id}/activate`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Impossible de valider le menu.");
      }
      router.push("/courses");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Une erreur est survenue.");
      setActivation(false);
    }
  }

  return (
    <>
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h1 className="retro text-[30px] leading-[1.3]">La semaine</h1>
          <HandNote className="text-[21px] text-carmin" tilt={-4}>
            {labelSemaine(menu.weekStart)}
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
        ≈ {fcfa(menu.estimatedCostFcfa, false)} F sur {fcfa(weeklyBudgetFcfa, false)}
      </p>

      <div
        role="tablist"
        aria-label="Jours de la semaine"
        className="mt-4 flex justify-between gap-0.5 border-b-2 border-dashed border-biscuit pb-2.5"
      >
        {jours.map((j, i) => {
          const active = i === selected;
          return (
            <button
              key={j.date}
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
              <span className="text-[11px] font-extrabold tracking-wide">{j.short}</span>
              <span className="font-display text-xl font-semibold leading-none">
                {j.date.slice(-2)}
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

      <div key={day.date} className="mt-3.5 flex flex-col gap-3.5">
        {day.meals.map((repas, i) => (
          <MealCard
            key={repas.id}
            recipe={versRecetteUI(repas)}
            slot={repas.slot as SlotUI}
            tag={repas.leftoverFromId ? "restes" : undefined}
            delay={i * 90}
            onChanger={peutModifier ? () => ouvrirChoix(repas) : undefined}
          />
        ))}
      </div>

      {menu.generationNotes && (
        <div className="mt-[22px] flex items-start gap-1.5 pl-1.5">
          <HandArrow className="shrink-0 text-palme" />
          <HandNote as="p" className="text-xl leading-[1.1] text-palme" tilt={-1.5}>
            {menu.generationNotes}
          </HandNote>
        </div>
      )}

      {erreur && (
        <p className="fixed bottom-[160px] left-[max(20px,calc(50%-195px))] z-40 rounded-xl bg-carmin px-4 py-2 text-xs font-bold text-creme">
          {erreur}
        </p>
      )}

      {estBrouillon && peutModifier ? (
        <button
          type="button"
          disabled={activation}
          onClick={activerMenu}
          className="press fixed bottom-[104px] left-[max(20px,calc(50%-195px))] z-40 flex h-[50px] items-center gap-2 rounded-[16px_20px_18px_14px] bg-palme px-[18px] text-sm font-extrabold text-creme disabled:opacity-60"
        >
          <CheckIcon size={18} strokeWidth={3} className="text-or" />
          {activation ? "Validation…" : "C'est bon, on fait les courses"}
        </button>
      ) : !estBrouillon ? (
        <Link
          href="/courses"
          className="press fixed bottom-[104px] left-[max(20px,calc(50%-195px))] z-40 flex h-[50px] items-center gap-2 rounded-[16px_20px_18px_14px] bg-palme px-[18px] text-sm font-extrabold text-creme"
        >
          <CheckIcon size={18} strokeWidth={3} className="text-or" />
          Voir les courses
        </Link>
      ) : null}

      {cible && !chargement && alternatives.length > 0 && (
        <ChoixRecette
          slot={cible.slot}
          currentId={cible.currentId}
          recipes={alternatives}
          onChoose={choisirRecette}
          onClose={() => setCible(null)}
        />
      )}
    </>
  );
}
