"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HandNote, Pin } from "@/components/main-levee";
import { ArrowRight } from "@/components/icones";
import { StockIllustration } from "@/components/illustrations/aliments";
import { cx, expiryLabel } from "@/lib/format";
import type { StockIcon } from "@/lib/types";

type ArticleStock = {
  id: string;
  ingredientId: string;
  ingredientName: string;
  category: string;
  unitId: string;
  unitLabel: string;
  quantity: number;
  location: string;
  expiresAt: string | null;
  status: string;
  addedAt: string;
};

type CatalogueIngredient = {
  id: string;
  name: string;
  category: string;
  defaultUnitId: string | null;
  units: { id: string; label: string }[];
};

const POSTITS = [
  { paper: "bg-or", pin: "bg-tomate", tilt: -4, ink: "text-carmin" },
  { paper: "bg-rose", pin: "bg-palme", tilt: 2.5, ink: "text-puce" },
  { paper: "bg-creme", pin: "bg-mangue", tilt: -1.5, ink: "text-puce" },
];

const LOCATIONS = [
  { value: "fridge", label: "Frigo" },
  { value: "freezer", label: "Congélateur" },
  { value: "pantry", label: "Placard" },
] as const;

const ICONPARNOM: Record<string, StockIcon> = {
  riz: "riz",
  "riz basmati": "riz",
  "riz paddy": "riz",
  attiéké: "riz",
  semoule: "riz",
  fonio: "riz",
  huile: "huile",
  "huile de palme": "huile",
  "huile d'arachide": "huile",
  "huile de coco": "huile",
  oignon: "oignon",
  "oignon vert": "oignon",
  échalote: "oignon",
  œuf: "oeuf",
  œufs: "oeuf",
  tomate: "tomate",
  "tomate fraîche": "tomate",
  "concentré de tomates": "tomate",
  piment: "piment",
  "piment frais": "piment",
  gombo: "gombo",
  aubergine: "aubergine",
  "aubergine africaine": "aubergine",
};

const ICONPARCATEGORIE: Partial<Record<string, StockIcon>> = {
  poisson: "poisson",
  "fruits de mer": "poisson",
  féculent: "riz",
  huile: "huile",
  œufs: "oeuf",
  légume: "tomate",
  condiment: "piment",
  épice: "piment",
};

function iconePour(name: string, category: string): StockIcon {
  const cle = name.toLowerCase().trim();
  if (ICONPARNOM[cle]) return ICONPARNOM[cle];
  for (const [prefix, icon] of Object.entries(ICONPARNOM)) {
    if (cle.startsWith(prefix)) return icon;
  }
  return ICONPARCATEGORIE[category] ?? "tomate";
}

function joursAvantExpiration(expiresAt: string | null): number | undefined {
  if (!expiresAt) return undefined;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function shelves<T>(items: T[], size = 3): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

export default function FridgePage() {
  const [articles, setArticles] = useState<ArticleStock[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueIngredient[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [ingredientId, setIngredientId] = useState("");
  const [unitIdManuel, setUnitIdManuel] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState<string>("fridge");
  const [envoi, setEnvoi] = useState(false);

  const chargerStock = useCallback(async () => {
    try {
      const r = await fetch("/api/stock");
      if (!r.ok) throw new Error("Impossible de charger le stock.");
      setArticles(await r.json());
    } catch {
      setErreur("Impossible de charger le stock.");
    }
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/stock").then((r) => (r.ok ? r.json() : Promise.reject())),
      fetch("/api/ingredients").then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([stockData, ingredientsData]) => {
        setArticles(stockData);
        setCatalogue(ingredientsData);
      })
      .catch(() => setErreur("Impossible de charger les données."))
      .finally(() => setChargement(false));
  }, []);

  const ingredientChoisi = catalogue.find((i) => i.id === ingredientId);
  const unitesDisponibles = useMemo(() => ingredientChoisi?.units ?? [], [ingredientChoisi]);

  const unitId = useMemo(() => {
    if (unitIdManuel && unitesDisponibles.some((u) => u.id === unitIdManuel)) return unitIdManuel;
    const defaut = ingredientChoisi?.defaultUnitId;
    if (defaut && unitesDisponibles.some((u) => u.id === defaut)) return defaut;
    return unitesDisponibles[0]?.id ?? "";
  }, [ingredientChoisi, unitesDisponibles, unitIdManuel]);

  async function declarerAchat(e: React.FormEvent) {
    e.preventDefault();
    if (!ingredientId || !unitId || !quantity) return;

    setEnvoi(true);
    try {
      const r = await fetch("/api/stock/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ ingredientId, unitId, quantity: Number(quantity), location }],
        }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => null);
        throw new Error(data?.message ?? "Erreur lors de l'ajout.");
      }
      const resultats = await r.json();
      const premier = resultats[0];
      setToast(
        `c'est rangé : ${premier.quantity} ${premier.unitLabel} de ${premier.ingredientName}`,
      );
      setIngredientId("");
      setUnitIdManuel(null);
      setQuantity("");
      await chargerStock();
      setTimeout(() => setToast(null), 2600);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Erreur lors de l'ajout.");
      setTimeout(() => setToast(null), 2600);
    } finally {
      setEnvoi(false);
    }
  }

  const soon = articles
    .filter((a) => {
      const j = joursAvantExpiration(a.expiresAt);
      return j !== undefined && j <= 3;
    })
    .sort((a, b) => joursAvantExpiration(a.expiresAt)! - joursAvantExpiration(b.expiresAt)!)
    .slice(0, 3);
  const soonIds = new Set(soon.map((a) => a.id));
  const others = articles.filter((a) => !soonIds.has(a.id));

  if (chargement) {
    return (
      <div className="-mx-5 -mb-[190px] -mt-6 flex min-h-dvh items-center justify-center bg-lagon px-5 pb-[190px] pt-[22px]">
        <p className="font-hand text-xl font-bold text-canard animate-pulse">
          Chargement du frigo…
        </p>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="-mx-5 -mb-[190px] -mt-6 flex min-h-dvh flex-col items-center justify-center gap-3 bg-lagon px-5 pb-[190px] pt-[22px]">
        <p className="font-hand text-xl font-bold text-carmin">{erreur}</p>
        <button
          onClick={() => {
            setErreur(null);
            setChargement(true);
            chargerStock().finally(() => setChargement(false));
          }}
          className="press rounded-xl bg-foret px-4 py-2 font-hand text-lg font-bold text-or"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="-mx-5 -mb-[190px] -mt-6 min-h-dvh bg-lagon px-5 pb-[190px] pt-[22px]">
      <header className="flex items-baseline gap-2.5">
        <h1 className="retro text-[30px] leading-[1.3]">Mon frigo</h1>
        <HandNote className="text-xl" tilt={-4}>
          {articles.length} {articles.length <= 1 ? "chose dedans" : "choses dedans"}
        </HandNote>
      </header>

      <form onSubmit={declarerAchat} className="wonky mt-3.5 bg-creme p-3">
        <p className="mb-1.5 font-hand text-xl font-bold leading-none text-carmin">
          t&apos;as fait des courses&nbsp;? ajoute ici
        </p>
        <div className="flex flex-col gap-2">
          <select
            value={ingredientId}
            onChange={(e) => {
              setIngredientId(e.target.value);
              setUnitIdManuel(null);
            }}
            className="h-[46px] rounded-[12px_16px_14px_12px] border-2 border-foret bg-white px-3 text-sm font-semibold"
            required
          >
            <option value="">Choisis un ingrédient…</option>
            {catalogue.map((ing) => (
              <option key={ing.id} value={ing.id}>
                {ing.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Quantité"
              min="0.1"
              step="any"
              className="h-[46px] w-24 rounded-[12px_16px_14px_12px] border-2 border-foret bg-white px-3 text-sm font-semibold placeholder:text-cacao/60"
              required
            />
            <select
              value={unitId}
              onChange={(e) => setUnitIdManuel(e.target.value)}
              className="h-[46px] min-w-0 flex-1 rounded-[12px_16px_14px_12px] border-2 border-foret bg-white px-3 text-sm font-semibold"
              required
              disabled={unitesDisponibles.length === 0}
            >
              {unitesDisponibles.length === 0 && <option value="">—</option>}
              {unitesDisponibles.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="h-[46px] rounded-[12px_16px_14px_12px] border-2 border-foret bg-white px-3 text-sm font-semibold"
            >
              {LOCATIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={envoi || !ingredientId || !unitId || !quantity}
            className="press h-[46px] rounded-[14px_12px_16px_12px] bg-foret px-3.5 text-sm font-extrabold text-or disabled:opacity-50"
          >
            {envoi ? "Ajout…" : "Ajouter"}
          </button>
        </div>
        {toast && (
          <p className="mt-2 animate-pop font-hand text-lg font-bold text-palme" role="status">
            {toast}
          </p>
        )}
      </form>

      {soon.length > 0 && (
        <>
          <h2 className="mt-[18px] font-display text-xl font-semibold">
            Ça presse{" "}
            <span className="font-hand text-[17px] font-bold text-canard">(dates estimées)</span>
          </h2>
          <ul className="mt-3 grid grid-cols-3 gap-2.5">
            {soon.map((s, i) => {
              const p = POSTITS[i % POSTITS.length];
              const jours = joursAvantExpiration(s.expiresAt) ?? 0;
              return (
                <li
                  key={s.id}
                  className={cx(
                    "paper-shadow relative flex animate-pop flex-col items-center gap-0.5 px-1.5 pb-2 pt-3",
                    p.paper,
                  )}
                  style={{ transform: `rotate(${p.tilt}deg)`, animationDelay: `${i * 100}ms` }}
                >
                  <Pin color={p.pin} />
                  <span className="flex h-10 items-center">
                    <StockIllustration
                      icon={iconePour(s.ingredientName, s.category)}
                      size={36}
                      className="animate-shake"
                    />
                  </span>
                  <span className="text-sm font-extrabold">{s.ingredientName}</span>
                  <span className={cx("font-hand text-[21px] font-bold leading-none", p.ink)}>
                    {expiryLabel(jours)}
                    {jours <= 1 && " !"}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {others.length > 0 && (
        <section
          aria-label="Dans le frigo"
          className="relative mt-5 rounded-[22px_26px_18px_24px] border-[3px] border-foret bg-creme px-3.5 pb-2.5 pt-3.5"
        >
          <span
            aria-hidden="true"
            className="absolute left-2.5 top-3.5 h-[60px] w-2 rounded border-2 border-foret bg-lagon"
          />
          {shelves(others).map((row, r) => (
            <div key={r} className="pl-3.5">
              <div className="flex h-[50px] items-end justify-around">
                {row.map((s) => (
                  <StockIllustration
                    key={s.id}
                    icon={iconePour(s.ingredientName, s.category)}
                    size={34}
                  />
                ))}
              </div>
              <div className="h-[5px] rounded-sm bg-canard" />
              <div className="flex justify-around pb-1 font-hand text-[17px] font-bold leading-snug">
                {row.map((s) => (
                  <span key={s.id}>
                    {s.ingredientName.toLowerCase()} · {s.quantity} {s.unitLabel}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {articles.length === 0 && (
        <p className="mt-8 text-center font-hand text-xl font-bold text-canard">
          Le frigo est vide. Ajoute tes courses ci-dessus !
        </p>
      )}

      <Link
        href="/stock/suggestions"
        className="press mt-[18px] flex h-[58px] w-[262px] -rotate-1 items-center justify-between rounded-[16px_20px_18px_14px] border-[2.5px] border-foret bg-or px-4 shadow-[0_4px_0_#13260F]"
      >
        <span className="flex flex-col leading-[1.05]">
          <span className="font-display text-lg font-bold">Vider le frigo</span>
          <span className="font-hand text-lg font-bold text-carmin">
            quels plats avec ce stock ?
          </span>
        </span>
        <ArrowRight />
      </Link>
    </div>
  );
}
