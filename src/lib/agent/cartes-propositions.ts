// Ce que la famille voit d'une proposition en attente : une carte avec titre, libellé et résumé.

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
        summary: `${data.estimatedCostFcfa ?? "?"} FCFA estimés`,
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
