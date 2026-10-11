"use client";

import Link from "next/link";
import { useState } from "react";
import { HandNote, Pin } from "@/components/Hand";
import { ArrowRight } from "@/components/Icons";
import { StockIllustration } from "@/components/illustrations/Food";
import { UrgencyButton } from "@/components/UrgencyButton";
import { cx, expiryLabel } from "@/lib/format";
import { stock as initialStock } from "@/lib/mock-data";
import type { StockItem } from "@/lib/types";

// Post-it « ça presse » : chacun sa couleur, sa punaise et son angle
const POSTITS = [
  { paper: "bg-or", pin: "bg-tomate", tilt: -4, ink: "text-carmin" },
  { paper: "bg-rose", pin: "bg-palme", tilt: 2.5, ink: "text-puce" },
  { paper: "bg-creme", pin: "bg-mangue", tilt: -1.5, ink: "text-puce" },
];

/** Range une liste en étagères de 3 */
function shelves<T>(items: T[], size = 3): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

export default function FridgePage() {
  const [items, setItems] = useState<StockItem[]>(initialStock);
  const [sentence, setSentence] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const soon = items
    .filter((s) => s.expiresInDays !== undefined && s.expiresInDays <= 3)
    .sort((a, b) => a.expiresInDays! - b.expiresInDays!)
    .slice(0, 3);
  const others = items.filter((s) => !soon.includes(s));

  // Simulation : plus tard, la phrase part vers POST /api/stock/purchases
  // et Tantie propose les produits reconnus avant confirmation.
  function declare(e: React.FormEvent) {
    e.preventDefault();
    if (!sentence.trim()) return;
    setItems((prev) => [...prev, { id: `n${Date.now()}`, name: "Tomates", quantity: "+2 tas", icon: "tomate", expiresInDays: 5 }]);
    setToast("c'est rangé : 2 tas de tomates");
    setSentence("");
    setTimeout(() => setToast(null), 2600);
  }

  return (
    <div className="-mx-5 -mb-[190px] -mt-6 min-h-dvh bg-lagon px-5 pb-[190px] pt-[22px]">
      <header className="flex items-baseline gap-2.5">
        <h1 className="retro text-[30px] leading-[1.3]">Mon frigo</h1>
        <HandNote className="text-xl" tilt={-4}>{items.length} choses dedans</HandNote>
      </header>

      <form onSubmit={declare} className="wonky mt-3.5 bg-creme p-3">
        <label htmlFor="achats" className="mb-1.5 block font-hand text-xl font-bold leading-none text-carmin">
          t&apos;as fait des courses&nbsp;? dis-moi tout
        </label>
        <div className="flex gap-2">
          <input
            id="achats"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder="2 tas de tomates et 1 kg de riz…"
            className="h-[46px] min-w-0 flex-1 rounded-[12px_16px_14px_12px] border-2 border-foret bg-white px-3 text-sm font-semibold placeholder:text-cacao/60"
          />
          <button type="submit" className="press h-[46px] rounded-[14px_12px_16px_12px] bg-foret px-3.5 text-sm font-extrabold text-or">
            Ajouter
          </button>
        </div>
        {toast && (
          <p className="mt-2 animate-pop font-hand text-lg font-bold text-palme" role="status">
            {toast}
          </p>
        )}
      </form>

      <h2 className="mt-[18px] font-display text-xl font-semibold">
        Ça presse <span className="font-hand text-[17px] font-bold text-canard">(dates estimées)</span>
      </h2>
      <ul className="mt-3 grid grid-cols-3 gap-2.5">
        {soon.map((s, i) => {
          const p = POSTITS[i % POSTITS.length];
          return (
            <li
              key={s.id}
              className={cx("paper-shadow relative flex animate-pop flex-col items-center gap-0.5 px-1.5 pb-2 pt-3", p.paper)}
              style={{ transform: `rotate(${p.tilt}deg)`, animationDelay: `${i * 100}ms` }}
            >
              <Pin color={p.pin} />
              <span className="flex h-10 items-center">
                <StockIllustration icon={s.icon} size={36} className="animate-shake" />
              </span>
              <span className="text-sm font-extrabold">{s.name}</span>
              <span className={cx("font-hand text-[21px] font-bold leading-none", p.ink)}>
                {expiryLabel(s.expiresInDays!)}
                {s.expiresInDays! <= 1 && " !"}
              </span>
            </li>
          );
        })}
      </ul>

      {/* L'intérieur du frigo : des étagères, pas une grille de cartes */}
      <section aria-label="Dans le frigo" className="relative mt-5 rounded-[22px_26px_18px_24px] border-[3px] border-foret bg-creme px-3.5 pb-2.5 pt-3.5">
        <span aria-hidden="true" className="absolute left-2.5 top-3.5 h-[60px] w-2 rounded border-2 border-foret bg-lagon" />
        {shelves(others).map((row, r) => (
          <div key={r} className="pl-3.5">
            <div className="flex h-[50px] items-end justify-around">
              {row.map((s) => (
                <StockIllustration key={s.id} icon={s.icon} size={34} />
              ))}
            </div>
            <div className="h-[5px] rounded-sm bg-canard" />
            <div className="flex justify-around pb-1 font-hand text-[17px] font-bold leading-snug">
              {row.map((s) => (
                <span key={s.id}>
                  {s.name.toLowerCase()} · {s.quantity}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>

      <Link
        href="/assistant"
        className="press mt-[18px] flex h-[58px] w-[262px] -rotate-1 items-center justify-between rounded-[16px_20px_18px_14px] border-[2.5px] border-foret bg-or px-4 shadow-[0_4px_0_#13260F]"
      >
        <span className="flex flex-col leading-[1.05]">
          <span className="font-display text-lg font-bold">Vider le frigo</span>
          <span className="font-hand text-lg font-bold text-carmin">3 plats possibles avec tout ça</span>
        </span>
        <ArrowRight />
      </Link>

      <UrgencyButton variant="round" />
    </div>
  );
}
