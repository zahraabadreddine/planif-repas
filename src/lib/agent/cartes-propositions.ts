import { fcfa } from "@/lib/format";

// Ce que la famille voit d'une proposition en attente : une carte avec titre, libellé et résumé.

type RepasPropose = { date?: unknown; slot?: unknown; recette?: unknown };

const MOMENT: Record<string, string> = { breakfast: "matin", lunch: "midi", dinner: "soir" };
const ORDRE = ["breakfast", "lunch", "dinner"];

/** « lun. 16 · midi : Garba · soir : Alloco » : les repas d'un menu proposé, un jour par ligne. */
export function repasParJour(repas: unknown): string[] {
  if (!Array.isArray(repas)) return [];
  const parJour = new Map<string, RepasPropose[]>();
  for (const r of repas as RepasPropose[]) {
    if (typeof r?.date !== "string" || typeof r.recette !== "string") continue;
    parJour.set(r.date, [...(parJour.get(r.date) ?? []), r]);
  }
  return [...parJour.keys()].sort().map((date) => {
    const jour = new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));
    const repasDuJour = parJour
      .get(date)!
      .sort((a, b) => ORDRE.indexOf(String(a.slot)) - ORDRE.indexOf(String(b.slot)))
      .map((r) => `${MOMENT[String(r.slot)] ?? "repas"} : ${r.recette}`);
    return `${jour} · ${repasDuJour.join(" · ")}`;
  });
}

/** Carte d'une proposition, envoyée au chat à la fin d'une réponse ou au rechargement. */
export function formaterProposition(p: {
  id: string;
  type: string;
  payload: unknown;
  status: string;
}) {
  const data = p.payload as Record<string, unknown>;

  switch (p.type) {
    case "mealChange":
      if (data.fete) {
        return {
          id: p.id,
          type: p.type,
          status: p.status,
          title: "Menu de fête",
          label: "Fête",
          summary: "Confirme pour l'ajouter à ton menu",
          fete: data.fete,
        };
      }
      if (typeof data.portions === "number") {
        return {
          id: p.id,
          type: p.type,
          status: p.status,
          title: `${data.portions} portions`,
          label: `« ${data.ancienneRecette ?? "?"} »`,
          summary: `Au lieu de ${data.anciennesPortions ?? "?"} : quantités et courses recalculées`,
        };
      }
      return {
        id: p.id,
        type: p.type,
        status: p.status,
        title: (data.nouvelleRecette as string) ?? "Changement de repas",
        label: `Remplacer « ${data.ancienneRecette ?? "?"} »`,
        summary: `${data.minutes ?? "?"} min de préparation`,
      };

    case "weekPlan":
      return {
        id: p.id,
        type: p.type,
        status: p.status,
        title: "Menu de la semaine",
        label: `Semaine du ${data.weekStart ?? "?"}`,
        summary:
          typeof data.estimatedCostFcfa === "number"
            ? `${fcfa(data.estimatedCostFcfa)} estimés`
            : "Coût à calculer",
        // Les repas proposés : la famille voit ce qu'elle confirme
        details: repasParJour(data.meals),
        lien: { href: "/menu", texte: "Voir sur la page Menu" },
      };

    case "emergency": {
      const options = (data.options ?? []) as Array<{ recetteId?: string; titre?: string }>;
      return {
        id: p.id,
        type: p.type,
        status: p.status,
        title: options[0]?.titre ?? "Mode urgence",
        label: "Urgence",
        // La famille choisit son plat parmi ces options au moment de confirmer
        options: options
          .filter((o) => o.recetteId && o.titre)
          .map((o) => ({ recetteId: String(o.recetteId), titre: String(o.titre) })),
        summary: `${options.length} option${options.length > 1 ? "s" : ""} rapide${options.length > 1 ? "s" : ""}`,
      };
    }

    case "purchase":
      return {
        id: p.id,
        type: p.type,
        status: p.status,
        title: "Enregistrer les achats",
        label: "Achats",
        summary: `${(data.items as unknown[])?.length ?? 0} article(s)`,
      };

    case "profileUpdate":
      return {
        id: p.id,
        type: p.type,
        status: p.status,
        title: "Mise à jour du profil",
        label: "Profil",
        summary: "Confirme les modifications",
      };

    default:
      return {
        id: p.id,
        type: p.type,
        status: p.status,
        title: "Proposition",
        label: "Action",
        summary: "Confirme pour appliquer",
      };
  }
}
