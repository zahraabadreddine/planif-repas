"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HandNote, Squiggle } from "@/components/Hand";
import { ChevronLeft, PinIcon } from "@/components/Icons";
import { UmiFull } from "@/components/Umi";
import { UrgencyButton } from "@/components/UrgencyButton";
import { cx, distance, fcfa, mapsLink } from "@/lib/format";
import { ingredientPrices, stores, usualStoreId } from "@/lib/mock-data";
import type { Store } from "@/lib/types";

type SortMode = "prix" | "proche";
type Row = { store: Store; price: number | null };

const CHIP_RADII = ["12px 16px 14px 10px", "16px 12px 10px 14px", "14px 10px 16px 12px", "10px 14px 12px 16px", "16px 14px 12px 10px"];

/**
 * Où acheter : pour un ingrédient, les magasins autour de l'utilisatrice, triés par prix ou par distance.
 * Règle du cahier des charges : le moins cher pour chaque article ; à moins de 10 % d'écart,
 * le lieu où se trouve déjà le reste de la liste.
 */
export default function WhereToBuyPage() {
  const [itemId, setItemId] = useState(ingredientPrices[0].id);
  const [sort, setSort] = useState<SortMode>("prix");
  const [query, setQuery] = useState("");

  const item = ingredientPrices.find((i) => i.id === itemId)!;

  const { rows, cheapest, nearest, pick } = useMemo(() => {
    const all: Row[] = stores.map((store) => ({ store, price: item.prices[store.id] ?? null }));
    const available = all.filter((r) => r.price !== null) as (Row & { price: number })[];
    const cheapest = [...available].sort((a, b) => a.price - b.price || a.store.distanceM - b.store.distanceM)[0];
    const nearest = [...available].sort((a, b) => a.store.distanceM - b.store.distanceM)[0];
    const usual = available.find((r) => r.store.id === usualStoreId);
    const pick = usual && usual.price <= cheapest.price * 1.1 ? usual : cheapest;
    const rows = [...all].sort((a, b) => {
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return sort === "prix" ? a.price - b.price || a.store.distanceM - b.store.distanceM : a.store.distanceM - b.store.distanceM;
    });
    return { rows, cheapest, nearest, pick, usual };
  }, [item, sort]);

  const rank = Object.fromEntries(rows.map((r, i) => [r.store.id, i + 1]));
  const label = item.label.toLowerCase();
  let tip: string;
  if (pick === cheapest && pick.store.id === usualStoreId) {
    tip = `Prends tes ${label} à Adjamé : c'est le moins cher, et tu y vas déjà pour le reste de la liste.`;
  } else if (pick.store.id === usualStoreId) {
    tip = `Adjamé est à ${fcfa(pick.price - cheapest.price, false)} F du moins cher. Comme tu y vas déjà, prends-les là-bas.`;
  } else {
    tip = `${cheapest.store.name} est le moins cher (${fcfa(cheapest.price, false)} F). ${nearest.store.name} est le plus près si tu es pressée.`;
  }

  // Recherche simple dans les ingrédients connus (plus tard : recherche côté serveur)
  function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    const found = ingredientPrices.find((i) => i.label.toLowerCase().startsWith(q) || i.label.toLowerCase().includes(q));
    if (found) setItemId(found.id);
  }

  return (
    <>
      <header className="flex items-center gap-2">
        <Link href="/courses" aria-label="Retour à la liste de courses" className="-ml-3 flex h-11 w-11 shrink-0 items-center justify-center">
          <ChevronLeft size={22} strokeWidth={2.8} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="retro text-[28px] leading-[1.25]">Où acheter&nbsp;?</h1>
          <HandNote className="text-[19px] text-carmin" tilt={-2}>près de chez toi, au meilleur prix</HandNote>
        </div>
        <UrgencyButton variant="square" />
      </header>

      <form onSubmit={search} className="mt-3 flex items-center gap-2">
        <label htmlFor="ingredient-search" className="sr-only">Chercher un ingrédient</label>
        <div className="relative flex-1">
          <svg className="absolute left-3 top-[15px] text-cacao" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            id="ingredient-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="tomates, poisson, riz…"
            className="h-12 w-full rounded-[14px_18px_16px_12px] border-2 border-foret bg-white pl-[38px] pr-3 text-[15px] font-semibold placeholder:text-cacao/60"
          />
        </div>
        {/* Position : le quartier donné à l'accueil, ou le téléphone si elle accepte (jamais enregistrée) */}
        <button type="button" className="press flex h-12 items-center gap-1 rounded-[12px_16px_14px_12px] bg-lagon px-2.5 text-left text-xs font-extrabold leading-tight">
          <PinIcon size={16} strokeWidth={2.6} />
          Cocody
          <br />
          changer
        </button>
      </form>

      <div role="radiogroup" aria-label="Ingrédient" className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1">
        {ingredientPrices.map((i, k) => {
          const on = i.id === itemId;
          return (
            <button
              key={i.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setItemId(i.id)}
              className={cx("press h-9 shrink-0 whitespace-nowrap px-3 text-[13px] font-extrabold transition-colors", on ? "-rotate-3 bg-foret text-or" : "bg-white")}
              style={{ borderRadius: CHIP_RADII[k % CHIP_RADII.length] }}
            >
              {i.label}
            </button>
          );
        })}
      </div>

      {/* Petite carte dessinée */}
      <div className="relative mt-3 h-[138px] overflow-hidden rounded-[22px_28px_20px_26px] bg-sable">
        <svg viewBox="0 0 350 138" className="h-full w-full" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Carte des magasins autour de toi">
          <path d="M262 138 C270 112 300 98 350 92 L350 138 Z" fill="#8FC1C9" />
          <text x="306" y="126" fontFamily="var(--font-caveat), cursive" fontWeight={700} fontSize={15} fill="#2C4A4A">lagune</text>
          <path d="M-4 84 C60 76 110 92 170 80 S280 54 354 60" fill="none" stroke="#FFFDF7" strokeWidth={10} strokeLinecap="round" />
          <path d="M128 -4 C122 40 136 90 120 142" fill="none" stroke="#FFFDF7" strokeWidth={8} strokeLinecap="round" />
          <path d="M220 -4 C226 30 214 70 236 140" fill="none" stroke="#FFFDF7" strokeWidth={6} strokeLinecap="round" />
          <path d="M20 30 h40 M30 116 h50 M270 20 h50" stroke="#F3C98B" strokeWidth={12} strokeLinecap="round" />
          <circle cx="96" cy="96" r="16" fill="none" stroke="#344F30" strokeWidth={3} className="origin-svg-center animate-ping" />
          <circle cx="96" cy="96" r="11" fill="#344F30" stroke="#13260F" strokeWidth={2.5} />
          <path d="M91 96 q2 -2 4 0 M98 96 q2 -2 4 0 M93 100 q3 3 6 0" fill="none" stroke="#FDD973" strokeWidth={1.6} strokeLinecap="round" />
          <text x="74" y="124" fontFamily="var(--font-caveat), cursive" fontWeight={700} fontSize={16} fill="#13260F">toi</text>
          {stores.map((s, i) => {
            const isPick = s.id === pick.store.id;
            const unavailable = item.prices[s.id] === null;
            return (
              <g key={`${s.id}-${itemId}-${sort}`} transform={`translate(${s.mapX} ${s.mapY})`}>
                <g className="origin-[0px_0px] animate-pop" style={{ animationDelay: `${i * 70}ms` }}>
                  <path
                    d="M0 0 C-12 -14 -14 -20 -14 -26 a14 14 0 0 1 28 0 c0 6 -2 12 -14 26 z"
                    fill={isPick ? "#F47230" : unavailable ? "#F3DDB8" : "#FFFDF7"}
                    stroke="#13260F"
                    strokeWidth={isPick ? 3 : 2}
                  />
                  <text x="0" y="-21" textAnchor="middle" fontFamily="var(--font-fredoka), sans-serif" fontWeight={700} fontSize={15} fill="#13260F">
                    {rank[s.id]}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div role="tablist" aria-label="Trier" className="flex gap-[18px]">
          {(
            [
              ["prix", "Le moins cher"],
              ["proche", "Le plus proche"],
            ] as const
          ).map(([key, text]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={sort === key}
              onClick={() => setSort(key)}
              className={cx("relative h-10 font-display text-[17px] font-semibold", sort === key ? "text-foret" : "text-cacao")}
            >
              {text}
              {sort === key && <Squiggle width={100} color="#F47230" animated className="absolute bottom-0 left-0 w-full" />}
            </button>
          ))}
        </div>
        <span className="text-xs font-extrabold text-cacao">pour {item.quantity}</span>
      </div>

      <ul className="mt-1">
        {rows.map((r, i) => {
          const isPick = r.store.id === pick.store.id;
          const badge = r === cheapest ? "le moins cher" : r === nearest ? "le plus proche" : null;
          return (
            <li
              key={`${r.store.id}-${itemId}-${sort}`}
              className={cx("flex h-14 animate-slide-up items-center gap-2.5 border-b-2 border-dotted border-biscuit", r.price === null && "opacity-45")}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span
                className={cx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-[50%_46%_52%_48%] border-2 border-foret font-display text-sm font-bold",
                  isPick ? "bg-sirop text-puce" : "bg-white",
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-extrabold">{r.store.name}</p>
                <p className="text-xs font-bold text-cacao">
                  {distance(r.store.distanceM)} · {r.store.access}
                </p>
              </div>
              <span className="flex flex-col items-end leading-none">
                <span className="whitespace-nowrap font-display text-base font-semibold">
                  {r.price === null ? "pas dispo" : `${fcfa(r.price, false)} F`}
                </span>
                {badge && <span className="mt-0.5 whitespace-nowrap font-hand text-base font-bold text-palme">{badge}</span>}
              </span>
              {r.price !== null && (
                <a
                  href={mapsLink(r.store.mapsQuery)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Itinéraire vers ${r.store.name}`}
                  className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px_14px_12px_10px] bg-foret text-or"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 11l18-8-8 18-2-8z" />
                  </svg>
                </a>
              )}
            </li>
          );
        })}
      </ul>

      {/* Le conseil d'Umi */}
      <div className="mt-4 flex items-end gap-2.5" aria-live="polite">
        <UmiFull size={44} className="shrink-0" />
        <p key={tip} className="paper-shadow flex-1 animate-pop rounded-[16px_18px_18px_4px] bg-or px-3 py-2.5 text-[13px] font-bold leading-snug">
          {tip}
        </p>
      </div>
    </>
  );
}
