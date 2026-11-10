"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HandNote, Pin } from "@/components/main-levee";
import { ArrowRight } from "@/components/icones";
import { StockIllustration } from "@/components/illustrations/aliments";
import { pluriel } from "@/lib/catalogue/quantites";
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

type UniteAchat = { id: string; label: string; grams: number; equivalence: string | null };

type CatalogueIngredient = {
  id: string;
  name: string;
  category: string;
  defaultUnitId: string | null;
  units: UniteAchat[];
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

/** 1.1 → « 1,1 » : nombres à la française, deux décimales au plus. */
const nombre = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

/** « 2 pièces », « 1,5 tas », « 1 sachet ». */
const quantiteAvecUnite = (n: number, unite: string) => `${nombre(n)} ${pluriel(unite, n)}`;

/** Message d'erreur de l'API, ou un message simple si le serveur ne répond pas. */
async function messageErreur(reponse: Response, defaut: string): Promise<string> {
  const corps = await reponse.json().catch(() => null);
  return corps?.error?.message ?? defaut;
}

export function FridgePage({ lectureSeule }: { lectureSeule: boolean }) {
  const [articles, setArticles] = useState<ArticleStock[]>([]);
  const [catalogue, setCatalogue] = useState<CatalogueIngredient[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [choisi, setChoisi] = useState<ArticleStock | null>(null);

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

  // Une seule minuterie : un nouveau message n'est pas effacé par celle du précédent
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  function annoncer(texte: string) {
    setToast(texte);
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => setToast(null), 3200);
  }

  const ingredientChoisi = catalogue.find((i) => i.id === ingredientId);
  const unitesDisponibles = useMemo(() => ingredientChoisi?.units ?? [], [ingredientChoisi]);

  const unitId = useMemo(() => {
    if (unitIdManuel && unitesDisponibles.some((u) => u.id === unitIdManuel)) return unitIdManuel;
    const defaut = ingredientChoisi?.defaultUnitId;
    if (defaut && unitesDisponibles.some((u) => u.id === defaut)) return defaut;
    return unitesDisponibles[0]?.id ?? "";
  }, [ingredientChoisi, unitesDisponibles, unitIdManuel]);
  const uniteChoisie = unitesDisponibles.find((u) => u.id === unitId);

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
      if (!r.ok) throw new Error(await messageErreur(r, "Erreur lors de l'ajout."));
      const resultats = await r.json();
      const premier = resultats[0];
      annoncer(
        `c'est rangé : ${quantiteAvecUnite(premier.quantity, premier.unitLabel)} de ${premier.ingredientName}`,
      );
      setIngredientId("");
      setUnitIdManuel(null);
      setQuantity("");
      await chargerStock();
    } catch (err) {
      annoncer(err instanceof Error ? err.message : "Erreur lors de l'ajout.");
    } finally {
      setEnvoi(false);
    }
  }

  async function apresModification(message: string) {
    setChoisi(null);
    annoncer(message);
    await chargerStock();
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

  // En lecture seule, un aliment se regarde seulement ; sinon un appui ouvre ses actions
  const choisir = (article: ArticleStock) => (lectureSeule ? undefined : () => setChoisi(article));

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
          {articles.length === 0
            ? "rien dedans"
            : `${articles.length} ${articles.length === 1 ? "chose dedans" : "choses dedans"}`}
        </HandNote>
      </header>

      {lectureSeule ? (
        <p className="mt-3.5 rounded-[16px_12px_18px_14px] bg-creme/80 px-4 py-2.5 text-sm font-bold text-foret">
          Tu peux seulement voir le frigo de ce foyer.
        </p>
      ) : (
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
              aria-label="Ingrédient"
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
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Combien ?"
                aria-label="Combien"
                min="0.1"
                step="any"
                className="h-[46px] w-28 shrink-0 rounded-[12px_16px_14px_12px] border-2 border-foret bg-white px-3 text-sm font-semibold placeholder:text-cacao/60"
                required
              />
              <select
                value={unitId}
                onChange={(e) => setUnitIdManuel(e.target.value)}
                aria-label="Unité"
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
            </div>
            {uniteChoisie?.equivalence && (
              <p className="-mt-0.5 pl-1 text-[13px] font-bold text-cacao">
                {uniteChoisie.equivalence}
              </p>
            )}
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              aria-label="Rangement"
              className="h-[46px] w-full rounded-[12px_16px_14px_12px] border-2 border-foret bg-white px-3 text-sm font-semibold"
            >
              {LOCATIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={envoi || !ingredientId || !unitId || !quantity}
              className="press h-[46px] rounded-[14px_12px_16px_12px] bg-foret px-3.5 text-sm font-extrabold text-or disabled:opacity-50"
            >
              {envoi ? "Ajout…" : "Ajouter"}
            </button>
          </div>
        </form>
      )}

      {toast && (
        <p className="mt-2 animate-pop font-hand text-lg font-bold text-palme" role="status">
          {toast}
        </p>
      )}

      {choisi && (
        <ActionsArticle
          key={choisi.id}
          article={choisi}
          onFait={apresModification}
          onFermer={() => setChoisi(null)}
        />
      )}

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
                  className={cx("paper-shadow relative animate-pop", p.paper)}
                  style={{ transform: `rotate(${p.tilt}deg)`, animationDelay: `${i * 100}ms` }}
                >
                  <button
                    type="button"
                    onClick={choisir(s)}
                    disabled={lectureSeule}
                    aria-label={`${s.ingredientName}, ${quantiteAvecUnite(s.quantity, s.unitLabel)}`}
                    className="flex min-h-11 w-full flex-col items-center gap-0.5 px-1.5 pb-2 pt-3 disabled:cursor-default"
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
                  </button>
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
                  <button
                    key={s.id}
                    type="button"
                    onClick={choisir(s)}
                    disabled={lectureSeule}
                    className={cx(
                      "min-h-11 px-1 text-center",
                      !lectureSeule && "underline decoration-dotted underline-offset-4",
                    )}
                  >
                    {s.ingredientName.toLowerCase()} · {quantiteAvecUnite(s.quantity, s.unitLabel)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {articles.length > 0 && !lectureSeule && !choisi && (
        <p className="mt-2 text-center font-hand text-[17px] font-bold text-canard">
          touche un aliment pour corriger, retirer ou dire qu&apos;il est jeté
        </p>
      )}

      {articles.length === 0 && (
        <p className="mt-8 text-center font-hand text-xl font-bold text-canard">
          {lectureSeule
            ? "Le frigo est vide."
            : "Le frigo est vide. Ajoute tes courses ci-dessus !"}
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

const champ =
  "h-11 w-24 rounded-[12px_16px_14px_12px] border-2 border-foret bg-white px-3 text-sm font-semibold";
const bouton =
  "press h-11 rounded-[12px_16px_14px_12px] px-3 text-sm font-extrabold disabled:opacity-50";

/**
 * Actions sur un aliment du frigo (EF-14). Rien n'est effacé : chaque action crée un mouvement
 * de stock (règle 5). « Retirer » est une correction à 0 (une erreur de saisie), « Jeté » compte
 * dans le gaspillage.
 */
function ActionsArticle({
  article,
  onFait,
  onFermer,
}: {
  article: ArticleStock;
  onFait: (message: string) => Promise<void>;
  onFermer: () => void;
}) {
  const cadre = useRef<HTMLElement>(null);
  const [reste, setReste] = useState(String(article.quantity));
  const [jete, setJete] = useState(String(article.quantity));
  const [confirmerRetrait, setConfirmerRetrait] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const quantite = quantiteAvecUnite(article.quantity, article.unitLabel);
  const nom = article.ingredientName.toLowerCase();

  useEffect(() => {
    cadre.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  async function envoyer(chemin: string, methode: string, valeur: number, message: string) {
    setEnCours(true);
    setErreur(null);
    try {
      const r = await fetch(chemin, {
        method: methode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: valeur }),
      });
      if (!r.ok) throw new Error(await messageErreur(r, "Ça n'a pas marché. Réessaie."));
      await onFait(message);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Pas de connexion internet. Réessaie.");
      setEnCours(false);
    }
  }

  const resteValide = reste !== "" && Number(reste) >= 0 && Number(reste) !== article.quantity;
  const jeteValide = jete !== "" && Number(jete) > 0;

  return (
    <section
      ref={cadre}
      aria-label={`Modifier ${article.ingredientName}`}
      className="paper-shadow mt-3.5 rounded-[20px_16px_22px_18px] border-[2.5px] border-foret bg-creme p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-lg font-semibold leading-tight text-foret">
          {article.ingredientName}
          <span className="block text-sm font-bold text-cacao">il y en a {quantite}</span>
        </p>
        <button
          type="button"
          onClick={onFermer}
          className="h-11 px-2 text-sm font-extrabold text-cacao underline"
        >
          Fermer
        </button>
      </div>

      <div className="mt-3 border-t-2 border-dashed border-sable pt-3">
        <label className="block text-sm font-extrabold text-foret" htmlFor="reste">
          Corriger : il en reste
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            id="reste"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={reste}
            onChange={(e) => setReste(e.target.value)}
            className={champ}
          />
          <span className="text-sm font-bold text-cacao">{article.unitLabel}</span>
          <button
            type="button"
            disabled={enCours || !resteValide}
            onClick={() =>
              envoyer(
                `/api/stock/${article.id}`,
                "PATCH",
                Number(reste),
                `c'est corrigé : ${quantiteAvecUnite(Number(reste), article.unitLabel)} de ${nom}`,
              )
            }
            className={`${bouton} ml-auto bg-foret text-or`}
          >
            Enregistrer
          </button>
        </div>
      </div>

      <div className="mt-3 border-t-2 border-dashed border-sable pt-3">
        <label className="block text-sm font-extrabold text-foret" htmlFor="jete">
          C&apos;est abîmé : j&apos;en ai jeté
        </label>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            id="jete"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={jete}
            onChange={(e) => setJete(e.target.value)}
            className={champ}
          />
          <span className="text-sm font-bold text-cacao">{article.unitLabel}</span>
          <button
            type="button"
            disabled={enCours || !jeteValide}
            onClick={() =>
              envoyer(
                `/api/stock/${article.id}/thrown`,
                "POST",
                Number(jete),
                `noté comme jeté : ${quantiteAvecUnite(Math.min(Number(jete), article.quantity), article.unitLabel)} de ${nom}`,
              )
            }
            className={`${bouton} ml-auto border-2 border-carmin text-carmin`}
          >
            Jeté
          </button>
        </div>
        <p className="mt-1 text-[13px] font-bold text-cacao">
          Compté dans le gaspillage, pour t&apos;aider à moins jeter.
        </p>
      </div>

      <div className="mt-3 border-t-2 border-dashed border-sable pt-3">
        {confirmerRetrait ? (
          <div role="alertdialog" aria-label={`Retirer ${article.ingredientName}`}>
            <p className="text-sm font-bold text-foret">
              Retirer {nom} du frigo ? C&apos;est une erreur de saisie : ce n&apos;est pas compté
              comme gaspillé.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={enCours}
                onClick={() =>
                  envoyer(`/api/stock/${article.id}`, "PATCH", 0, `${nom} est retiré du frigo`)
                }
                className={`${bouton} flex-1 bg-carmin text-creme`}
              >
                {enCours ? "Un instant…" : "Oui, retirer"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmerRetrait(false)}
                className={`${bouton} flex-1 border-2 border-foret text-foret`}
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmerRetrait(true)}
            className={`${bouton} w-full border-2 border-dashed border-foret text-foret`}
          >
            Erreur de saisie : retirer cet aliment
          </button>
        )}
      </div>

      {erreur && (
        <p role="alert" className="mt-3 text-sm font-bold text-carmin">
          {erreur}
        </p>
      )}
    </section>
  );
}
