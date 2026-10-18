import Link from "next/link";
import { Plate } from "./illustrations/assiette";
import { ArrowRight } from "./icones";
import { fcfa } from "@/lib/format";
import type { MealSlot, Recipe } from "@/lib/types";

const SLOT_LABEL: Record<MealSlot, string> = { lunch: "à midi", dinner: "le soir" };

type Props = {
  recipe: Recipe;
  slot: MealSlot;
  tag?: string;
  delay?: number;
};

/** Carte repas : l'assiette déborde à gauche, le tag est un post-it collé en haut */
export function MealCard({ recipe, slot, tag, delay = 0 }: Props) {
  return (
    <article
      className="relative ml-3.5 min-h-[118px] animate-slide-up rounded-[20px_26px_22px_24px] bg-white py-3.5 pl-[92px] pr-3.5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className="absolute -left-4 top-3 flex h-24 w-24 items-center justify-center rounded-full"
        style={{ background: recipe.colors.tint }}
      >
        <Plate colors={recipe.colors} size={84} className="animate-float" />
      </div>

      <p className="font-hand text-[19px] font-bold leading-none text-carmin">{SLOT_LABEL[slot]}</p>
      <h3 className="mt-0.5 font-display text-[19px] font-semibold leading-tight">{recipe.name}</h3>
      <p className="mt-0.5 text-[13px] font-bold text-cacao">
        {recipe.minutes} min · {fcfa(recipe.costFcfa, false)} F
      </p>
      <div className="mt-1.5 flex items-center gap-3.5">
        <Link href="/recettes" className="flex h-9 items-center gap-1 text-sm font-extrabold">
          La recette <ArrowRight size={16} strokeWidth={2.8} />
        </Link>
        <Link
          href="/chat"
          className="flex h-9 items-center text-[13px] font-extrabold text-carmin underline decoration-wavy underline-offset-4"
        >
          changer
        </Link>
      </div>

      {tag && (
        <span className="paper-shadow absolute -top-3 right-2.5 rotate-[4deg] bg-or px-2.5 pb-1 pt-0.5 font-hand text-[17px] font-bold text-puce">
          {tag}
        </span>
      )}
    </article>
  );
}
