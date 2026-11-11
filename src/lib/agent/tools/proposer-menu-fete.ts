import type { SessionVerifiee } from "@/lib/auth/garde";
import { composerFete } from "@/lib/planificateur/fete";
import { feteSchema, type DemandeFete } from "@/lib/validation/fete";
import type { ContexteOutil, OutilAgent } from "./types";

// L'IA choisit les plats ; le code vérifie allergies et équipement, calcule le coût et le budget
// (règles 2 et 3). La famille met le menu dans sa semaine en appuyant sur la carte (règle 1).
async function executer(session: SessionVerifiee, input: DemandeFete, contexte: ContexteOutil) {
  const fete = await composerFete(session, input);
  contexte.afficher?.({ type: "fete", fete });
  return {
    totalFcfa: fete.totalFcfa,
    budgetFcfa: fete.budgetFcfa,
    dansLeBudget: fete.depassementFcfa === 0,
    depassementFcfa: fete.depassementFcfa,
    sansPrix: fete.sansPrix,
    message:
      fete.depassementFcfa > 0
        ? "Le menu dépasse le budget : dis-le en une phrase et propose de retirer ou remplacer un plat."
        : "La famille voit le menu de fête sur une carte, avec un bouton pour le mettre dans son menu. Ne recopie pas la carte : dis en une phrase ce que tu proposes.",
  };
}

export const proposerMenuFete: OutilAgent<typeof feteSchema> = {
  nom: "proposerMenuFete",
  description:
    "Propose un menu de fête : plusieurs plats (recettes du catalogue ou plats gardés par le foyer, trouvés avec searchRecipes) au même repas, pour un nombre d'invités et un budget. Le code vérifie les allergies et calcule le coût total. Un plat imaginé doit d'abord être gardé par la famille.",
  schema: feteSchema,
  executer,
};
