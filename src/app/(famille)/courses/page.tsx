"use client";

import { useState } from "react";
import { HandNote, Tape } from "@/components/main-levee";
import { PinIcon, WhatsAppIcon } from "@/components/icones";
import { UrgencyButton } from "@/components/bouton-urgence";
import { fcfa, mapsLink, whatsappLink } from "@/lib/format";
import { household, shoppingList } from "@/lib/donnees-simulees";
import type { StoreKind } from "@/lib/types";

const TITLE_COLOR: Record<StoreKind, string> = {
  market: "text-carmin",
  supermarket: "text-canard",
  shop: "text-palme",
};

/** Le bas du ticket de caisse, en dents de scie */
const ZIGZAG = "M0 0h350v1" + "l-7 10-7-10".repeat(25) + "z";

/** Case à cocher dessinée à la main ; la coche se trace quand on la coche */
function HandCheckbox({ checked }: { checked: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" className="shrink-0 overflow-visible" aria-hidden="true">
      <path d="M3 4c5-1.2 11-1 17 .2.8 5.2.6 10.4-.2 15.6-5.4.8-11 .9-16.4-.2C2.6 14.4 2.4 9.2 3 4z" fill="#fff" stroke="#13260F" strokeWidth={2} />
      {checked && (
        <path className="drawn-sm animate-tick" d="M5 12l5 6L23 -1" fill="none" stroke="#9F350B" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export default function ShoppingPage() {
  const [done, setDone] = useState<Record<string, boolean>>({ tom: true });

  const allItems = shoppingList.flatMap((b) => b.items);
  const total = allItems.reduce((s, it) => s + it.priceFcfa, 0);
  const bought = allItems.filter((it) => done[it.id]).length;
  const left = allItems.length - bought;

  const shareText =
    `Liste de courses (${household.weekLabel}) · environ ${fcfa(total)}\n\n` +
    shoppingList
      .map((b) => `${b.title.toUpperCase()} – ${b.store}\n` + b.items.map((it) => `• ${it.name} : ${it.quantity}`).join("\n"))
      .join("\n\n");

  return (
    <div className="-mx-5 -mb-[190px] -mt-6 min-h-dvh bg-mangue px-5 pb-[190px] pt-[22px]">
      <header className="flex items-baseline gap-2.5">
        <h1 className="retro text-[30px] leading-[1.3]">Les courses</h1>
        <HandNote className="text-xl text-puce" tilt={-4}>pour toute la semaine</HandNote>
      </header>

      <div className="mt-3 flex items-center gap-3">
        <a
          href={whatsappLink(shareText)}
          target="_blank"
          rel="noreferrer"
          className="press flex h-12 items-center gap-2 rounded-[14px_18px_16px_12px] bg-foret px-4 text-sm font-extrabold text-creme"
        >
          <WhatsAppIcon size={20} className="text-or" /> Envoyer sur WhatsApp
        </a>
        <p className="font-hand text-[19px] font-bold leading-[1.05] text-puce" aria-live="polite">
          {left === 0 ? (
            "tout est dans le panier !"
          ) : (
            <>
              {bought} dans le panier,
              <br />
              encore {left}
            </>
          )}
        </p>
      </div>

      {/* Le ticket */}
      <div className="paper-shadow relative mt-5 animate-drop bg-[#FFFDF7] px-[18px] pb-3.5 pt-[18px]">
        <Tape className="-top-3 left-1/2 w-[84px] -translate-x-1/2 -rotate-3" />

        {shoppingList.map((block) => (
          <section key={block.kind} className="mb-2 border-b-2 border-dashed border-biscuit pb-2">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <h2 className={`font-hand text-[23px] font-bold leading-none ${TITLE_COLOR[block.kind]}`}>{block.title}</h2>
                <p className="text-xs font-bold text-cacao">
                  {block.store} · {block.distance}
                </p>
              </div>
              <a href={mapsLink(block.mapsQuery)} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-1 text-[13px] font-extrabold">
                <PinIcon size={16} strokeWidth={2.6} className="text-carmin" /> y aller
              </a>
            </div>
            <ul>
              {block.items.map((it) => {
                const checked = !!done[it.id];
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      aria-pressed={checked}
                      onClick={() => setDone((d) => ({ ...d, [it.id]: !d[it.id] }))}
                      className="flex h-[34px] w-full items-center gap-2.5 text-left"
                    >
                      <HandCheckbox checked={checked} />
                      <span className={`whitespace-nowrap text-[15px] font-extrabold transition-opacity ${checked ? "line-through opacity-45" : ""}`}>
                        {it.name}
                      </span>
                      <span className="whitespace-nowrap text-[13px] font-bold text-cacao">{it.quantity}</span>
                      <span className="mt-2 h-0 flex-1 border-b-2 border-dotted border-biscuit" />
                      <span className="text-sm font-extrabold text-puce">{fcfa(it.priceFcfa, false)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <div className="flex items-baseline justify-between pt-0.5">
          <span className="text-[13px] font-extrabold tracking-widest">TOTAL ESTIMÉ</span>
          <span className="font-display text-2xl font-semibold">≈ {fcfa(total, false)} F</span>
        </div>
        <svg aria-hidden="true" className="absolute -bottom-2.5 left-0 h-[11px] w-full" viewBox="0 0 350 11" preserveAspectRatio="none">
          <path d={ZIGZAG} fill="#FFFDF7" />
        </svg>
      </div>

      <UrgencyButton variant="round" />
    </div>
  );
}
