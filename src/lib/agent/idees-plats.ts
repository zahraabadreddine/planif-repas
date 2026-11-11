import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { listerMembres } from "@/lib/foyer/membres";
import {
  incompatibilites,
  restrictionsDuFoyer,
  type IngredientAFiltrer,
  type RestrictionAFiltrer,
} from "@/lib/planificateur/filtres";
import { normaliser } from "@/lib/validation/membre";
import { grammesProposes } from "@/lib/catalogue/plats-foyer";
import {
  RAISONALLERGIE,
  RAISONFOUR,
  alimentsAutorises,
  cite,
  citeUneAllergie,
  fourManquant,
  lireArticles,
  listeEquipement,
  type AlimentAutorise,
  type IdeeFrigo,
} from "./idees-frigo";

// Quand le catalogue n'a pas le plat voulu (fête, cuisine d'ailleurs), Umi peut en imaginer un.
// L'IA propose, le code vérifie (règles 1 et 2) : seuls les ingrédients du catalogue sans danger
// pour le foyer sont permis. Aucune quantité ni aucun prix n'est inventé (règle 3).

export { CATEGORIESPLAT } from "@/lib/validation/plat-foyer";
import type { CategoriePlat } from "@/lib/validation/plat-foyer";

/** Ingrédient du catalogue, avec son identifiant quand il est connu (pour garder le plat). */
type IngredientDuCatalogue = IngredientAFiltrer & { id?: string };

export type PlatPropose = {
  titre: string;
  categorie?: CategoriePlat;
  ingredients: string[];
  etapes?: string[];
  personnes: number;
};

export type VerificationPlat = { ok: true; idee: IdeeFrigo } | { ok: false; raison: string };

/** « Tomates » ou « tomate » : même ingrédient. */
const cle = (nom: string) => normaliser(nom).replace(/(s|x)$/, "");

/** Noms des ingrédients du catalogue qu'aucun membre ne doit éviter (filtrés par le code). */
export function ingredientsPermis(
  catalogue: IngredientAFiltrer[],
  restrictions: RestrictionAFiltrer[],
): string[] {
  return catalogue
    .filter((i) => incompatibilites([i], restrictions).length === 0)
    .map((i) => i.name)
    .sort((a, b) => a.localeCompare(b, "fr"));
}

/**
 * Contrôle un plat imaginé par l'IA avant de le montrer :
 * chaque ingrédient doit venir du catalogue et convenir à tout le foyer ; le titre et les étapes
 * ne citent aucun aliment interdit ; pas de four si le foyer n'en a pas.
 */
export function verifierPlat(
  plat: PlatPropose,
  catalogue: IngredientDuCatalogue[],
  stock: AlimentAutorise[],
  restrictions: RestrictionAFiltrer[],
  equipement: string[] = [],
): VerificationPlat {
  const parCle = new Map(catalogue.map((i) => [cle(i.name), i]));
  const choisis: IngredientDuCatalogue[] = [];
  for (const nom of plat.ingredients) {
    const ingredient = parCle.get(cle(nom));
    if (!ingredient) {
      return {
        ok: false,
        raison: `« ${nom} » n'est pas dans le catalogue : choisis seulement des noms donnés par listerIngredientsPermis, ou fais sans.`,
      };
    }
    if (incompatibilites([ingredient], restrictions).length > 0)
      return { ok: false, raison: RAISONALLERGIE };
    if (!choisis.includes(ingredient)) choisis.push(ingredient);
  }

  const etapes = (plat.etapes ?? []).map((e) => e.trim()).filter(Boolean);
  const texte = normaliser([plat.titre, ...etapes].join(" "));
  const interditCite = catalogue.some(
    (i) => cite(texte, i.name) && incompatibilites([i], restrictions).length > 0,
  );
  if (interditCite || citeUneAllergie(texte, restrictions)) {
    return { ok: false, raison: RAISONALLERGIE };
  }
  if (fourManquant(texte, equipement)) return { ok: false, raison: RAISONFOUR };

  // Ce qui est déjà dans la cuisine, avec les quantités du stock ; le reste est à acheter
  const enStock = new Map(stock.map((a) => [cle(a.nom), a]));
  return {
    ok: true,
    idee: {
      titre: plat.titre.trim(),
      personnes: plat.personnes,
      minutes: null,
      categorie: plat.categorie,
      ingredients: choisis
        .filter((i) => enStock.has(cle(i.name)))
        .map((i) => ({ nom: i.name, quantite: enStock.get(cle(i.name))!.quantites.join(" + ") })),
      aAcheter: choisis.filter((i) => !enStock.has(cle(i.name))).map((i) => i.name),
      duPlacard: [],
      etapes,
      aGarder: choisis
        .filter((i): i is IngredientDuCatalogue & { id: string } => Boolean(i.id))
        .map((i) => ({
          ingredientId: i.id,
          nom: i.name,
          grammes: grammesProposes(i.category, plat.personnes),
        })),
    },
  };
}

async function lireCatalogue(): Promise<IngredientDuCatalogue[]> {
  return prisma.ingredient.findMany({
    select: { id: true, name: true, category: true, allergens: true },
  });
}

/** Ingrédients que l'IA peut utiliser pour imaginer un plat (règle 2 : filtrés avant qu'elle les voie). */
export async function lireIngredientsPermis(session: SessionVerifiee): Promise<string[]> {
  if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");
  const [catalogue, membres] = await Promise.all([lireCatalogue(), listerMembres(session)]);
  return ingredientsPermis(catalogue, restrictionsDuFoyer(membres));
}

/** Vérifie un plat avec le catalogue, le stock, les membres et l'équipement relus en base. */
export async function controlerPlat(
  session: SessionVerifiee,
  plat: PlatPropose,
): Promise<VerificationPlat> {
  if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");
  const [catalogue, membres, articles, foyer] = await Promise.all([
    lireCatalogue(),
    listerMembres(session),
    lireArticles(session.householdId),
    prisma.household.findUnique({
      where: { id: session.householdId },
      select: { equipment: true },
    }),
  ]);
  const restrictions = restrictionsDuFoyer(membres);
  return verifierPlat(
    plat,
    catalogue,
    alimentsAutorises(articles, restrictions),
    restrictions,
    listeEquipement(foyer?.equipment),
  );
}
