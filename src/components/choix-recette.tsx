"use client";

import { useEffect, useRef, useState } from "react";
import { Plate } from "./illustrations/assiette";
import { CloseIcon, ClockIcon } from "./icones";
import { cx, fcfa } from "@/lib/format";
import type { MealSlot, Recipe } from "@/lib/types";

const SLOT_LABEL: Record<MealSlot, string> = { lunch: "midi", dinner: "ce soir" };

type Props = {
  slot: MealSlot;
  currentId: string;
  recipes: Recipe[];
  onChoose: (recipeId: string) => void;
  onClose: () => void;
};

export function ChoixRecette({ slot, currentId, recipes, onChoose, onClose }: Props) {
  const [choisi, setChoisi] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fermer(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", fermer);
    return () => document.removeEventListener("keydown", fermer);
  }, [onClose]);

  const alternatives = recipes.filter((r) => r.id !== currentId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-foret/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="relative max-h-[85vh] animate-slide-up overflow-y-auto rounded-t-[28px] bg-creme px-4 pb-8 pt-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">
            Changer le repas de {SLOT_LABEL[slot]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="press flex h-11 w-11 items-center justify-center text-cacao"
            aria-label="Fermer"
          >
            <CloseIcon size={24} />
          </button>
        </div>

        {alternatives.length === 0 ? (
          <p className="mt-6 text-center font-hand text-xl font-bold text-cacao">
            Aucune autre recette disponible
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {alternatives.map((recipe) => {
              const actif = choisi === recipe.id;
              return (
                <li key={recipe.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setChoisi(recipe.id);
                      onChoose(recipe.id);
                    }}
                    disabled={choisi !== null}
                    className={cx(
                      "press relative flex w-full items-center gap-3.5 rounded-[16px_20px_18px_14px] bg-white px-3.5 py-3 text-left transition-shadow",
                      actif && "ring-2 ring-palme",
                    )}
                  >
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
                      style={{ background: recipe.colors.tint }}
                    >
                      <Plate colors={recipe.colors} size={48} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[17px] font-semibold leading-tight">
                        {recipe.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2.5 text-[13px] font-bold text-cacao">
                        <span className="flex items-center gap-0.5">
                          <ClockIcon size={14} /> {recipe.minutes} min
                        </span>
                        <span>{fcfa(recipe.costFcfa, false)} F</span>
                      </div>
                    </div>
                    {actif && (
                      <span className="font-hand text-lg font-bold text-palme">choisi !</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
