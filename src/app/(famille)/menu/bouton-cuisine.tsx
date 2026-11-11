"use client";

import { useState } from "react";
import { cx } from "@/lib/format";

type Deduction = { ingredientName: string; quantity: number; unitLabel: string };

/** 0.6667 → « 0,7 » : une décimale au plus, à la française. */
function quantite(nombre: number): string {
  return String(Math.round(nombre * 10) / 10).replace(".", ",");
}

/** Ce que la famille lit après avoir cuisiné : ce que le code a retiré du stock. */
export function texteDeductions(deductions: Deduction[], manquants: string[] = []): string {
  const retire =
    deductions.length === 0
      ? "Rien à retirer du stock pour ce repas."
      : `Retiré du stock : ${deductions
          .map((d) => `${quantite(d.quantity)} ${d.unitLabel} ${d.ingredientName.toLowerCase()}`)
          .join(", ")}.`;
  // Le stock ne descend pas sous zéro : ce qui manquait n'a pas pu être retiré
  if (manquants.length === 0) return retire;
  return `${retire} Pas (assez) en stock : ${manquants
    .map((m) => m.toLowerCase())
    .join(", ")}. Si tu les avais achetés, ajoute-les dans le stock.`;
}

type Props = {
  repasId: string;
  dejaCuisine: boolean;
  // Sur fond sombre (carte « ce soir » de l'accueil)
  clair?: boolean;
};

/**
 * « C'est cuisiné » : le repas passe en cuisiné et le code retire ses ingrédients du stock
 * (mouvements `cooked`, règle 5). La famille corrige depuis la page Stock si besoin.
 */
export function BoutonCuisine({ repasId, dejaCuisine, clair = false }: Props) {
  const [etat, setEtat] = useState<"attente" | "envoi" | "fait">(dejaCuisine ? "fait" : "attente");
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function cuisiner() {
    setEtat("envoi");
    setErreur(null);
    try {
      const reponse = await fetch(`/api/planned-meals/${repasId}/cooked`, { method: "POST" });
      const corps = await reponse.json().catch(() => null);
      if (!reponse.ok) {
        setErreur(corps?.error?.message ?? "Le repas n'a pas pu être enregistré. Réessaie.");
        setEtat("attente");
        return;
      }
      setMessage(texteDeductions(corps?.deductions ?? [], corps?.manquants ?? []));
      setEtat("fait");
    } catch {
      setErreur("Pas de connexion. Réessaie dans un instant.");
      setEtat("attente");
    }
  }

  return (
    <div aria-live="polite" className="flex flex-col gap-1">
      {etat === "fait" ? (
        <p className={cx("font-hand text-lg font-bold", clair ? "text-or" : "text-palme")}>
          cuisiné ✓
        </p>
      ) : (
        <button
          type="button"
          onClick={cuisiner}
          disabled={etat === "envoi"}
          className={cx(
            "press h-11 self-start rounded-[12px_16px_14px_12px] px-4 text-sm font-extrabold disabled:opacity-60",
            clair ? "bg-creme text-foret" : "bg-foret text-or",
          )}
        >
          {etat === "envoi" ? "Enregistrement…" : "C'est cuisiné"}
        </button>
      )}
      {message && (
        <p className={cx("text-xs font-bold", clair ? "text-creme" : "text-cacao")}>{message}</p>
      )}
      {erreur && <p className="text-xs font-bold text-carmin">{erreur}</p>}
    </div>
  );
}
