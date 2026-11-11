import { exigerSession } from "@/lib/auth/garde";
import { listerMembres } from "@/lib/foyer/membres";
import { restrictionsDuFoyer } from "@/lib/planificateur/filtres";
import { suggestionsUrgence } from "@/lib/urgence/suggestion";
import { MOMENTS, creneauDuMoment } from "@/lib/planificateur/moment";
import UrgenceInteractif, { type OptionUrgenceClient } from "./urgence-interactif";

const MAXMINUTES = 30;

export default async function UrgencePage() {
  const session = await exigerSession();
  const membres = await listerMembres(session);
  const restrictions = restrictionsDuFoyer(membres);

  // Le repas du moment, à l'heure d'Abidjan : avant 12 h, de 12 h à 17 h, ensuite le soir
  const creneau = creneauDuMoment();
  const suggestions = await suggestionsUrgence(session, MAXMINUTES, undefined, creneau);

  const options: OptionUrgenceClient[] = suggestions.map((s) => ({
    recipeId: s.id,
    name: s.title,
    minutes: s.totalMinutes,
    useSoon: s.utiliseUseSoon,
    portions: s.servings,
  }));

  const allergies = [
    ...new Set(restrictions.filter((r) => r.type === "allergy").map((r) => r.value)),
  ];
  const regimes = [
    ...new Set(
      restrictions.filter((r) => r.type === "diet").map((r) => r.value.replace(/-/g, " ")),
    ),
  ];
  const parties = [...allergies.map((a) => `sans ${a}`), ...regimes];
  const restrictionsTexte = parties.length > 0 ? `${parties.join(", ")}, promis` : "";

  return (
    <UrgenceInteractif
      membres={membres.length || 1}
      restrictionsTexte={restrictionsTexte}
      options={options}
      creneau={creneau}
      moment={MOMENTS[creneau].ce}
    />
  );
}
