import type { SessionVerifiee } from "@/lib/auth/garde";
import { creerProposition } from "@/lib/agent/proposals";
import { composerFete } from "@/lib/planificateur/fete";
import { feteSchema, type DemandeFete } from "@/lib/validation/fete";
import type { ContexteOutil, OutilAgent } from "./types";

// L'IA choisit les plats ; le code vérifie allergies et équipement, calcule le coût et le budget
// (règles 2 et 3). Le menu devient une proposition que la famille confirme (règle 1) : à la
// confirmation, le code revérifie tout avant de l'enregistrer.
async function executer(session: SessionVerifiee, input: DemandeFete, contexte: ContexteOutil) {
  const fete = await composerFete(session, input);
  const proposition = await creerProposition(contexte.conversationId, "mealChange", { fete });
  return {
    propositionId: proposition.id,
    totalFcfa: fete.totalFcfa,
    budgetFcfa: fete.budgetFcfa,
    dansLeBudget: fete.depassementFcfa === 0,
    depassementFcfa: fete.depassementFcfa,
    sansPrix: fete.sansPrix,
    message:
      fete.depassementFcfa > 0
        ? "Le menu dépasse le budget : dis-le en une phrase et propose de retirer ou remplacer un plat."
        : "La famille voit le menu de fête sur une carte et le confirme pour l'ajouter à son menu. Ne recopie pas la carte : dis en une phrase ce que tu proposes.",
  };
}

export const proposerMenuFete: OutilAgent<typeof feteSchema> = {
  nom: "proposerMenuFete",
  description:
    "Propose un menu de fête : plusieurs plats (recettes du catalogue ou plats gardés par le foyer, trouvés avec searchRecipes) au même repas, pour un nombre d'invités et un budget. Le code vérifie les allergies et calcule le coût total ; la famille confirme. Un plat imaginé doit d'abord être gardé par la famille.",
  schema: feteSchema,
  executer,
};
