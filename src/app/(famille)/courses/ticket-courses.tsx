"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlaceType } from "@prisma/client";
import { Tape } from "@/components/main-levee";
import { WhatsAppIcon } from "@/components/icones";
import { MessageErreur } from "@/components/champ-formulaire";
import { nombre, pluriel } from "@/lib/catalogue/quantites";
import type { ArticleEnregistre, ListeEnregistree } from "@/lib/courses/generation";
import { texteWhatsApp } from "@/lib/courses/whatsapp";
import { cx, fcfa, whatsappLink } from "@/lib/format";
import { OuAcheter } from "./ou-acheter";

const LIEUX: { type: PlaceType; titre: string; couleur: string }[] = [
  { type: "market", titre: "Marché", couleur: "text-carmin" },
  { type: "supermarket", titre: "Supermarché", couleur: "text-canard" },
  { type: "shop", titre: "Boutique", couleur: "text-palme" },
];

/** Le bas du ticket de caisse, en dents de scie */
const ZIGZAG = "M0 0h350v1" + "l-7 10-7-10".repeat(25) + "z";

const HORSLIGNE = "Pas de connexion internet. Réessaie dans un instant.";

/** Message d'erreur de l'API, ou un message par défaut. */
async function messageErreur(reponse: Response, defaut: string): Promise<string> {
  const corps = (await reponse.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  return corps?.error?.message ?? defaut;
}

function quantite(article: ArticleEnregistre): string {
  return `${nombre(article.quantity)} ${pluriel(article.unit, article.quantity)}`;
}

/** Case à cocher dessinée à la main ; la coche se trace quand on la coche */
function HandCheckbox({ checked }: { checked: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      className="shrink-0 overflow-visible"
      aria-hidden="true"
    >
      <path
        d="M3 4c5-1.2 11-1 17 .2.8 5.2.6 10.4-.2 15.6-5.4.8-11 .9-16.4-.2C2.6 14.4 2.4 9.2 3 4z"
        fill="#fff"
        stroke="#13260F"
        strokeWidth={2}
      />
      {checked && (
        <path
          className="drawn-sm animate-tick"
          d="M5 12l5 6L23 -1"
          fill="none"
          stroke="#9F350B"
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/** Menu validé mais liste pas encore préparée. */
export function PreparerListe({ menuId, peutModifier }: { menuId: string; peutModifier: boolean }) {
  const router = useRouter();
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function preparer() {
    setEnvoi(true);
    setErreur(null);
    try {
      const reponse = await fetch(`/api/meal-plans/${menuId}/shopping-list`, { method: "POST" });
      if (reponse.ok) {
        router.refresh();
        return;
      }
      setErreur(
        await messageErreur(reponse, "La liste n'a pas pu être préparée. Réessaie plus tard."),
      );
    } catch {
      setErreur(HORSLIGNE);
    }
    setEnvoi(false);
  }

  return (
    <div className="paper-shadow mt-5 bg-[#FFFDF7] px-[18px] py-5 text-center">
      <p className="font-hand text-[23px] font-bold leading-tight text-puce">
        Ton menu est prêt, ta liste pas encore
      </p>
      {peutModifier ? (
        <button
          type="button"
          onClick={preparer}
          disabled={envoi}
          className="press mt-4 inline-flex h-12 items-center rounded-[14px_18px_16px_12px] bg-foret px-5 text-sm font-extrabold text-creme disabled:opacity-60"
        >
          {envoi ? "Préparation…" : "Préparer ma liste"}
        </button>
      ) : (
        <p className="mt-2 text-sm font-bold text-cacao">
          La personne qui gère le foyer doit d&apos;abord la préparer.
        </p>
      )}
      {erreur && (
        <div className="mt-4 text-left">
          <MessageErreur>{erreur}</MessageErreur>
        </div>
      )}
    </div>
  );
}

type Props = { listeDeDepart: ListeEnregistree; peutModifier: boolean };

/** Le ticket de caisse : articles par lieu d'achat, cochés au fil des courses. */
export function TicketCourses({ listeDeDepart, peutModifier }: Props) {
  const [articles, setArticles] = useState(listeDeDepart.items);
  const [erreur, setErreur] = useState<string | null>(null);
  const liste = { ...listeDeDepart, items: articles };

  const achetes = articles.filter((a) => a.checked).length;
  const restants = articles.length - achetes;
  const sansPrix = articles.filter((a) => a.estimatedPriceFcfa === null).length;

  function changer(id: string, checked: boolean) {
    setArticles((liste) => liste.map((a) => (a.id === id ? { ...a, checked } : a)));
  }

  // Coche tout de suite, puis revient en arrière si l'enregistrement échoue
  async function cocher(article: ArticleEnregistre) {
    const checked = !article.checked;
    changer(article.id, checked);
    setErreur(null);
    try {
      const reponse = await fetch(`/api/shopping-lists/${listeDeDepart.id}/items/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked }),
      });
      if (reponse.ok) return;
      setErreur(
        await messageErreur(reponse, "L'article n'a pas pu être coché. Réessaie plus tard."),
      );
    } catch {
      setErreur(HORSLIGNE);
    }
    changer(article.id, !checked);
  }

  if (articles.length === 0) {
    return (
      <div className="paper-shadow mt-5 bg-[#FFFDF7] px-[18px] py-5 text-center">
        <p className="font-hand text-[23px] font-bold leading-tight text-puce">
          Rien à acheter : tout est déjà dans ta cuisine !
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-3 flex items-center gap-3">
        <a
          href={whatsappLink(texteWhatsApp(liste))}
          target="_blank"
          rel="noreferrer"
          className="press flex h-12 items-center gap-2 rounded-[14px_18px_16px_12px] bg-foret px-4 text-sm font-extrabold text-creme"
        >
          <WhatsAppIcon size={20} className="text-or" /> Envoyer sur WhatsApp
        </a>
        <p className="font-hand text-[19px] font-bold leading-[1.05] text-puce" aria-live="polite">
          {restants === 0 ? (
            "tout est dans le panier !"
          ) : (
            <>
              {achetes} dans le panier,
              <br />
              encore {restants}
            </>
          )}
        </p>
      </div>

      {erreur && (
        <div className="mt-3">
          <MessageErreur>{erreur}</MessageErreur>
        </div>
      )}

      {/* Le ticket */}
      <div className="paper-shadow relative mt-5 animate-drop bg-[#FFFDF7] px-[18px] pb-3.5 pt-[18px]">
        <Tape className="-top-3 left-1/2 w-[84px] -translate-x-1/2 -rotate-3" />

        {LIEUX.map(({ type, titre, couleur }) => {
          const duLieu = articles.filter((a) => a.placeType === type);
          if (duLieu.length === 0) return null;
          return (
            <section key={type} className="mb-2 border-b-2 border-dashed border-biscuit pb-2">
              <h2 className={cx("font-hand text-[23px] font-bold leading-none", couleur)}>
                {titre}
              </h2>
              <ul>
                {duLieu.map((article) => (
                  <li key={article.id}>
                    <button
                      type="button"
                      aria-pressed={article.checked}
                      disabled={!peutModifier}
                      onClick={() => cocher(article)}
                      className="flex min-h-11 w-full items-center gap-2.5 text-left"
                    >
                      <HandCheckbox checked={article.checked} />
                      <span
                        className={cx(
                          "text-[15px] font-extrabold transition-opacity",
                          article.checked && "line-through opacity-45",
                        )}
                      >
                        {article.ingredient}
                      </span>
                      <span className="whitespace-nowrap text-[13px] font-bold text-cacao">
                        {quantite(article)}
                      </span>
                      <span className="mt-2 h-0 flex-1 border-b-2 border-dotted border-biscuit" />
                      {article.estimatedPriceFcfa === null ? (
                        <span className="whitespace-nowrap text-xs font-bold italic text-cacao">
                          prix inconnu
                        </span>
                      ) : (
                        <span className="whitespace-nowrap text-sm font-extrabold text-puce">
                          {fcfa(article.estimatedPriceFcfa, false)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        <div className="flex items-baseline justify-between pt-0.5">
          <span className="text-[13px] font-extrabold tracking-widest">TOTAL ESTIMÉ</span>
          <span className="font-display text-2xl font-semibold">
            ≈ {fcfa(listeDeDepart.estimatedTotalFcfa, false)} F
          </span>
        </div>
        <p className="text-xs font-bold text-cacao">
          prix estimé d&apos;après les relevés du marché
        </p>
        {sansPrix > 0 && (
          <p className="mt-1 text-xs font-bold text-carmin">
            {sansPrix === 1
              ? "1 article sans prix connu n'est pas compté dans le total."
              : `${sansPrix} articles sans prix connu ne sont pas comptés dans le total.`}
          </p>
        )}
        <svg
          aria-hidden="true"
          className="absolute -bottom-2.5 left-0 h-[11px] w-full"
          viewBox="0 0 350 11"
          preserveAspectRatio="none"
        >
          <path d={ZIGZAG} fill="#FFFDF7" />
        </svg>
      </div>

      <OuAcheter listeId={listeDeDepart.id} />
    </>
  );
}
