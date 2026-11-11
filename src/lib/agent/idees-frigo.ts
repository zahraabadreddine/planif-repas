import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { listerMembres } from "@/lib/foyer/membres";
import {
  equipementManquant,
  incompatibilites,
  restrictionsDuFoyer,
  type IngredientAFiltrer,
  type RestrictionAFiltrer,
} from "@/lib/planificateur/filtres";
import { normaliser, reconnaitreAllergene } from "@/lib/validation/membre";

// « Vider le frigo » en conversation : Umi peut imaginer un plat simple avec le stock du foyer.
// L'IA propose, le code vérifie (règles 1 et 2) : elle ne voit que les aliments autorisés,
// et chaque idée est contrôlée avant d'être montrée. Les quantités viennent du stock (règle 3).

export type ArticlePourIdee = {
  ingredientId: string;
  name: string;
  category: string;
  allergens: string[];
  quantity: number;
  unitLabel: string;
  gramsEquivalent: number;
  status: string;
};

export type AlimentAutorise = {
  ingredientId: string;
  nom: string;
  // « 5 pièces », « 1,5 kg » : ce qui est dans le stock, calculé par le code
  quantites: string[];
  // Poids total en stock et aliment qui nourrit (pas un assaisonnement), calculés par le code
  grammes: number;
  principal: boolean;
  aUtiliserVite: boolean;
};

/** Grammes d'aliments principaux à prévoir par personne pour qu'une idée nourrisse vraiment. */
export const GRAMMESPARPERSONNE = 250;

/** Catégories d'assaisonnement : elles ne comptent pas dans ce qui nourrit. */
const ASSAISONNEMENTS = new Set(["epice", "epicerie", "huile", "herbe", "oleagineux"]);

/** Ce qui n'est jamais acheté et peut toujours être cité dans les étapes. */
const TOUJOURSDISPONIBLE = new Set(["eau"]);

/**
 * Produits de base que la famille a presque toujours : comptés comme présents,
 * sauf si elle a dit à Umi qu'elle n'en a plus. Les allergies restent vérifiées avant.
 */
export const BASES = {
  sel: { mot: "sel", noms: ["sel"] },
  huile: { mot: "huile", noms: ["huile", "huile vegetale"] },
} as const;
export type Base = keyof typeof BASES;

/** 1.5 → « 1,5 » : deux décimales au plus, à la française. */
function nombre(quantite: number): string {
  return String(Math.round(quantite * 100) / 100).replace(".", ",");
}

/** Aliments du stock qu'aucun membre ne doit éviter, regroupés par ingrédient. */
export function alimentsAutorises(
  articles: ArticlePourIdee[],
  restrictions: RestrictionAFiltrer[],
): AlimentAutorise[] {
  const parIngredient = new Map<string, AlimentAutorise>();
  for (const article of articles) {
    if (article.quantity <= 0) continue;
    if (incompatibilites([article], restrictions).length > 0) continue;
    const aliment = parIngredient.get(article.ingredientId) ?? {
      ingredientId: article.ingredientId,
      nom: article.name,
      quantites: [],
      grammes: 0,
      principal: !ASSAISONNEMENTS.has(normaliser(article.category)),
      aUtiliserVite: false,
    };
    aliment.quantites.push(`${nombre(article.quantity)} ${article.unitLabel}`);
    aliment.grammes += Math.round(article.quantity * article.gramsEquivalent);
    aliment.aUtiliserVite ||= article.status === "useSoon";
    parIngredient.set(article.ingredientId, aliment);
  }
  return [...parIngredient.values()];
}

export type IdeeProposee = {
  titre: string;
  ingredientIds: string[];
  etapes: string[];
  personnes: number;
  minutes?: number;
  // Produits de base que la famille a dit ne pas avoir
  basesManquantes?: Base[];
};

export type IdeeFrigo = {
  titre: string;
  personnes: number;
  minutes: number | null;
  ingredients: { nom: string; quantite: string }[];
  // Produits de base cités dans les étapes (sel, huile), pris dans le placard
  duPlacard: string[];
  etapes: string[];
  // Idée de plat avec achats : ce qu'il faut acheter (sans quantité, que l'IA ne fixe pas)
  aAcheter?: string[];
  // Entrée, plat, accompagnement ou dessert, pour un repas de fête
  categorie?: string;
  // Pour « Garder ce plat » : quantités proposées par le code, que la famille valide (règle 3)
  aGarder?: { ingredientId: string; nom: string; grammes: number }[];
};

/** Un allergène nommé autrement (« cacahuètes ») ou une autre allergie écrite par le parent. */
export function citeUneAllergie(texte: string, restrictions: RestrictionAFiltrer[]): boolean {
  const mots = texte.split(/[^a-z0-9]+/).filter(Boolean);
  return restrictions.some((restriction) => {
    if (restriction.type !== "allergy") return false;
    const valeur = normaliser(restriction.value);
    return (
      mots.some((m) => reconnaitreAllergene(m) === restriction.value) ||
      (valeur.length > 2 && cite(texte, valeur))
    );
  });
}

/** Une cuisson au four alors que le foyer n'a pas déclaré de four. */
export function fourManquant(texte: string, equipement: string[]): boolean {
  return equipementManquant(cite(texte, "four") ? ["four"] : [], equipement).length > 0;
}

export const RAISONFOUR =
  "Le foyer n'a pas de four : propose une cuisson à la poêle ou à la marmite.";
export const RAISONALLERGIE =
  "L'idée cite un aliment interdit pour un membre du foyer. Propose une autre idée.";

export type VerificationIdee = { ok: true; idee: IdeeFrigo } | { ok: false; raison: string };

/** Le nom apparaît comme mot entier dans le texte (pluriel en s ou x compris). */
export function cite(texte: string, nom: string): boolean {
  const mot = normaliser(nom).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${mot}(s|x)?($|[^a-z0-9])`).test(texte);
}

/**
 * Contrôle une idée de l'IA avant de la montrer à la famille :
 * - chaque ingrédient doit être un aliment autorisé du stock ;
 * - le titre et les étapes ne citent aucun aliment interdit à un membre, ni un aliment à acheter.
 */
export function verifierIdee(
  idee: IdeeProposee,
  autorises: AlimentAutorise[],
  catalogue: IngredientAFiltrer[],
  restrictions: RestrictionAFiltrer[],
  // Équipement du foyer : sans four déclaré, une idée au four est refusée
  equipement: string[] = [],
): VerificationIdee {
  const parId = new Map(autorises.map((a) => [a.ingredientId, a]));
  const ingredients = [...new Set(idee.ingredientIds)].map((id) => parId.get(id));
  if (ingredients.some((a) => a === undefined)) {
    return {
      ok: false,
      raison:
        "Un ingrédient de l'idée n'est pas dans le stock autorisé : utilise seulement les identifiants de alimentsAutorises donnés par findRecipesFromStock.",
    };
  }
  const choisis = ingredients as AlimentAutorise[];
  const nomsChoisis = new Set(choisis.map((a) => normaliser(a.nom)));
  const nomsDuStock = new Set(autorises.map((a) => normaliser(a.nom)));
  const texte = normaliser([idee.titre, ...idee.etapes].join(" "));
  const manquantes = new Set(idee.basesManquantes ?? []);
  const basesPresentes = (Object.keys(BASES) as Base[]).filter((b) => !manquantes.has(b));
  const nomsDeBase = new Set<string>(basesPresentes.flatMap((b) => BASES[b].noms));

  for (const base of manquantes) {
    if (cite(texte, BASES[base].mot)) {
      return {
        ok: false,
        raison: `La famille n'a pas de ${BASES[base].mot} : propose une idée sans ${BASES[base].mot}.`,
      };
    }
  }

  for (const ingredient of catalogue) {
    if (!cite(texte, ingredient.name)) continue;
    if (incompatibilites([ingredient], restrictions).length > 0) {
      return {
        ok: false,
        raison: `L'idée cite « ${ingredient.name} », interdit pour un membre du foyer. Propose une autre idée.`,
      };
    }
    const nom = normaliser(ingredient.name);
    if (!nomsChoisis.has(nom) && !TOUJOURSDISPONIBLE.has(nom) && !nomsDeBase.has(nom)) {
      return {
        ok: false,
        raison: nomsDuStock.has(nom)
          ? `L'idée cite « ${ingredient.name} » sans l'avoir dans ses ingrédients : ajoute-le à ingredientIds ou retire-le des étapes.`
          : `L'idée cite « ${ingredient.name} », qui n'est pas dans le stock : la famille ne veut rien acheter.`,
      };
    }
  }

  if (fourManquant(texte, equipement)) return { ok: false, raison: RAISONFOUR };

  // Assez à manger pour tout le monde : calculé par le code avec le poids du stock (règle 3)
  const nourrit = choisis.filter((a) => a.principal).reduce((total, a) => total + a.grammes, 0);
  if (nourrit < GRAMMESPARPERSONNE * idee.personnes) {
    const possible = Math.floor(nourrit / GRAMMESPARPERSONNE);
    return {
      ok: false,
      raison:
        possible === 0
          ? "Ces aliments ne suffisent pas pour un repas : dis-le honnêtement à la famille."
          : `Pas assez pour ${idee.personnes} personnes (environ ${nourrit} g d'aliments principaux, il en faut ${GRAMMESPARPERSONNE} g par personne). Propose l'idée pour ${possible} personne${possible > 1 ? "s" : ""} au plus, ou dis à la famille qu'il faudrait acheter.`,
    };
  }

  if (citeUneAllergie(texte, restrictions)) return { ok: false, raison: RAISONALLERGIE };

  return {
    ok: true,
    idee: {
      titre: idee.titre.trim(),
      personnes: idee.personnes,
      minutes: idee.minutes ?? null,
      ingredients: choisis.map((a) => ({ nom: a.nom, quantite: a.quantites.join(" + ") })),
      // Une base déjà dans les ingrédients (huile du stock) n'est pas répétée « du placard »
      duPlacard: basesPresentes.filter(
        (b) => cite(texte, BASES[b].mot) && !BASES[b].noms.some((n) => nomsChoisis.has(n)),
      ),
      etapes: idee.etapes.map((e) => e.trim()).filter(Boolean),
    },
  };
}

/** Le stock du foyer de la session, avec les allergènes de chaque ingrédient. */
export async function lireArticles(householdId: string): Promise<ArticlePourIdee[]> {
  const articles = await prisma.stockItem.findMany({
    where: { householdId, status: { in: ["ok", "useSoon"] }, quantity: { gt: 0 } },
    include: {
      ingredient: { select: { name: true, category: true, allergens: true } },
      unit: { select: { label: true, gramsEquivalent: true } },
    },
    orderBy: [{ expiresAt: "asc" }],
  });
  return articles.map((a) => ({
    ingredientId: a.ingredientId,
    name: a.ingredient.name,
    category: a.ingredient.category,
    allergens: a.ingredient.allergens,
    quantity: a.quantity,
    unitLabel: a.unit.label,
    gramsEquivalent: a.unit.gramsEquivalent,
    status: a.status,
  }));
}

/** Aliments autorisés du foyer de la session (règle 4 : le foyer vient de la session). */
export async function lireAlimentsAutorises(session: SessionVerifiee): Promise<AlimentAutorise[]> {
  if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");
  const [articles, membres] = await Promise.all([
    lireArticles(session.householdId),
    listerMembres(session),
  ]);
  return alimentsAutorises(articles, restrictionsDuFoyer(membres));
}

/** Vérifie une idée avec le stock, le catalogue et les membres relus en base. */
export async function controlerIdee(
  session: SessionVerifiee,
  idee: IdeeProposee,
): Promise<VerificationIdee> {
  if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");
  const [articles, membres, catalogue, foyer] = await Promise.all([
    lireArticles(session.householdId),
    listerMembres(session),
    prisma.ingredient.findMany({ select: { name: true, category: true, allergens: true } }),
    prisma.household.findUnique({
      where: { id: session.householdId },
      select: { equipment: true },
    }),
  ]);
  const restrictions = restrictionsDuFoyer(membres);
  const equipement = listeEquipement(foyer?.equipment);
  return verifierIdee(
    idee,
    alimentsAutorises(articles, restrictions),
    catalogue,
    restrictions,
    equipement,
  );
}

/** L'équipement enregistré du foyer (« four »…), ou une liste vide s'il est mal formé. */
export function listeEquipement(brut: unknown): string[] {
  return Array.isArray(brut) ? brut.filter((e): e is string => typeof e === "string") : [];
}
