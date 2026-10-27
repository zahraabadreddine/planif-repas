import {
  JOURSSEMAINE,
  TEMPSMAXSOIRSEMAINE,
  estJourDeSemaine,
  type Candidat,
  type MenuCompose,
  type ParametresComposition,
  type RepasCompose,
} from "@/lib/planificateur/composition";
import {
  incompatibilites,
  type IngredientAFiltrer,
  type RestrictionAFiltrer,
} from "@/lib/planificateur/filtres";

// Contrôle final du menu avant tout enregistrement (CLAUDE.md §3, règle 2 : le code revérifie).
// Fonction pure : elle ne corrige rien, elle liste les problèmes trouvés.

export type RecetteAVerifier = Candidat & { ingredients: IngredientAFiltrer[] };

export type CodeProbleme =
  | "RECETTEINCONNUE"
  | "INCOMPATIBLE"
  | "NOMBREREPAS"
  | "CRENEAU"
  | "TEMPSDEPASSE"
  | "RECETTEREPETEE"
  | "RESTEINCOHERENT"
  | "COUTINCORRECT"
  | "BUDGETDEPASSE";

export type Probleme = { code: CodeProbleme; message: string };

const SLOTS: RepasCompose["slot"][] = ["lunch", "dinner"];

const nomCreneau = (repas: RepasCompose) =>
  `${repas.slot === "lunch" ? "déjeuner" : "dîner"} du jour ${repas.jour + 1}`;

function verifierCreneaux(menu: MenuCompose): Probleme[] {
  const problemes: Probleme[] = [];
  if (menu.repas.length !== JOURSSEMAINE * SLOTS.length) {
    problemes.push({
      code: "NOMBREREPAS",
      message: `Le menu doit compter ${JOURSSEMAINE * SLOTS.length} repas.`,
    });
  }
  for (let jour = 0; jour < JOURSSEMAINE; jour++) {
    for (const slot of SLOTS) {
      const nombre = menu.repas.filter((r) => r.jour === jour && r.slot === slot).length;
      if (nombre !== 1) {
        problemes.push({
          code: "NOMBREREPAS",
          message: `Le ${slot === "lunch" ? "déjeuner" : "dîner"} du jour ${jour + 1} doit apparaître une fois.`,
        });
      }
    }
  }
  return problemes;
}

function verifierRecette(
  repas: RepasCompose,
  recette: RecetteAVerifier,
  restrictions: RestrictionAFiltrer[],
  parametres: ParametresComposition,
): Probleme[] {
  const problemes: Probleme[] = [];
  for (const { membre, raison } of incompatibilites(recette.ingredients, restrictions)) {
    problemes.push({
      code: "INCOMPATIBLE",
      message: `Le ${nomCreneau(repas)} ne convient pas à ${membre} (${raison}).`,
    });
  }
  if (!recette.mealTypes.includes(repas.slot)) {
    problemes.push({ code: "CRENEAU", message: `La recette du ${nomCreneau(repas)} n'est pas prévue pour ce repas.` });
  }
  const soirDeSemaine = repas.slot === "dinner" && estJourDeSemaine(parametres.weekStart, repas.jour);
  if (repas.resteDe === null && soirDeSemaine && recette.minutes > TEMPSMAXSOIRSEMAINE) {
    problemes.push({
      code: "TEMPSDEPASSE",
      message: `Le ${nomCreneau(repas)} prend plus de ${TEMPSMAXSOIRSEMAINE} minutes.`,
    });
  }
  return problemes;
}

/** Un reste suit le dîner de la veille, même recette, cuisinée en double ; il ne coûte rien. */
function verifierReste(menu: MenuCompose, repas: RepasCompose, personnes: number): Probleme[] {
  const diner = repas.resteDe === null ? undefined : menu.repas[repas.resteDe];
  const coherent =
    repas.slot === "lunch" &&
    diner !== undefined &&
    diner.slot === "dinner" &&
    diner.jour === repas.jour - 1 &&
    diner.recetteId === repas.recetteId &&
    diner.resteDe === null &&
    diner.portions === 2 * personnes &&
    repas.portions === personnes &&
    repas.coutFcfa === 0;
  return coherent
    ? []
    : [{ code: "RESTEINCOHERENT", message: `Le reste du ${nomCreneau(repas)} ne correspond pas au dîner de la veille.` }];
}

/** Un dîner cuisiné en double doit avoir son reste le lendemain midi. */
function verifierDouble(menu: MenuCompose, indice: number, personnes: number): Probleme[] {
  const repas = menu.repas[indice];
  if (repas.portions === personnes) return [];
  const reste = menu.repas.some((r) => r.resteDe === indice);
  if (repas.slot === "dinner" && repas.portions === 2 * personnes && reste) return [];
  return [{ code: "RESTEINCOHERENT", message: `Les portions du ${nomCreneau(repas)} ne correspondent à aucun reste.` }];
}

function verifierCouts(
  menu: MenuCompose,
  recettes: Map<string, RecetteAVerifier>,
  budgetFcfa: number,
): Probleme[] {
  const problemes: Probleme[] = [];
  for (const repas of menu.repas.filter((r) => r.resteDe === null)) {
    const recette = recettes.get(repas.recetteId);
    if (recette && repas.coutFcfa !== recette.coutParPortionFcfa * repas.portions) {
      problemes.push({ code: "COUTINCORRECT", message: `Le coût du ${nomCreneau(repas)} est incorrect.` });
    }
  }
  const somme = menu.repas.reduce((total, r) => total + r.coutFcfa, 0);
  if (menu.totalFcfa !== somme) {
    problemes.push({ code: "COUTINCORRECT", message: "Le total du menu ne correspond pas à ses repas." });
  }
  if (somme > budgetFcfa) {
    problemes.push({ code: "BUDGETDEPASSE", message: "Le menu dépasse le budget de la semaine." });
  }
  return problemes;
}

/** Problèmes du menu (liste vide : il peut être enregistré). */
export function verifierMenu(
  menu: MenuCompose,
  recettes: RecetteAVerifier[],
  restrictions: RestrictionAFiltrer[],
  parametres: ParametresComposition,
): Probleme[] {
  const parId = new Map(recettes.map((r) => [r.id, r]));
  const problemes = verifierCreneaux(menu);
  const cuisinees = new Set<string>();

  menu.repas.forEach((repas, indice) => {
    const recette = parId.get(repas.recetteId);
    if (!recette) {
      problemes.push({ code: "RECETTEINCONNUE", message: `La recette du ${nomCreneau(repas)} est introuvable.` });
      return;
    }
    problemes.push(...verifierRecette(repas, recette, restrictions, parametres));
    if (repas.resteDe !== null) {
      problemes.push(...verifierReste(menu, repas, parametres.personnes));
      return;
    }
    if (cuisinees.has(repas.recetteId)) {
      problemes.push({ code: "RECETTEREPETEE", message: `La recette du ${nomCreneau(repas)} est déjà au menu.` });
    }
    cuisinees.add(repas.recetteId);
    problemes.push(...verifierDouble(menu, indice, parametres.personnes));
  });

  return [...problemes, ...verifierCouts(menu, parId, parametres.budgetFcfa)];
}
