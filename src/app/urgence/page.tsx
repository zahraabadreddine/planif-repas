import { exigerSession } from "@/lib/auth/garde";
import { listerMembres } from "@/lib/foyer/membres";
import {
  restrictionsDuFoyer,
  incompatibilites,
} from "@/lib/planificateur/filtres";
import { chargerRecettes } from "@/lib/catalogue/recettes";
import UrgenceInteractif, { type OptionUrgence } from "./urgence-interactif";

const MAX_MINUTES = 30;

export default async function UrgencePage() {
  const session = await exigerSession();
  const membres = await listerMembres(session);
  const restrictions = restrictionsDuFoyer(membres);

  const recettes = await chargerRecettes();
  const options: OptionUrgence[] = recettes
    .map((r) => ({
      recette: r,
      total: r.prepMinutes + r.cookMinutes,
    }))
    .filter(({ total }) => total <= MAX_MINUTES)
    .filter(
      ({ recette }) =>
        incompatibilites(
          recette.ingredients.map((l) => l.ingredient),
          restrictions,
        ).length === 0,
    )
    .sort((a, b) => a.total - b.total)
    .map(({ recette, total }) => ({
      recipeId: recette.id,
      name: recette.title,
      minutes: total,
      uses: recette.ingredients
        .filter((l) => !l.optional)
        .slice(0, 3)
        .map((l) => l.ingredient.name.toLowerCase())
        .join(", "),
    }));

  const allergies = [
    ...new Set(restrictions.filter((r) => r.type === "allergy").map((r) => r.value)),
  ];
  const regimes = [
    ...new Set(
      restrictions
        .filter((r) => r.type === "diet")
        .map((r) => r.value.replace(/-/g, " ")),
    ),
  ];
  const parties = [...allergies.map((a) => `sans ${a}`), ...regimes];
  const restrictionsTexte =
    parties.length > 0 ? `${parties.join(", ")}, promis` : "";

  return (
    <UrgenceInteractif
      membres={membres.length || 1}
      restrictionsTexte={restrictionsTexte}
      options={options}
    />
  );
}
