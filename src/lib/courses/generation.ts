import type { PlaceType } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { VILLE } from "@/lib/catalogue/recettes";
import { listeDeCourses, type IngredientPourListe } from "./liste";

// Liste de courses enregistrée d'un menu (EF-09, EF-10). Le foyer vient toujours de la
// session (règle 4) : une liste ou un menu d'un autre foyer est traité comme introuvable.

// Sans prix connu : produits emballés au supermarché, produits frais au marché (CLAUDE.md §11).
const CATEGORIESSUPERMARCHE = new Set([
  "conserve",
  "épicerie",
  "huile",
  "épice",
  "produit laitier",
]);

export function lieuParDefaut(categorie: string): PlaceType {
  return CATEGORIESSUPERMARCHE.has(categorie) ? "supermarket" : "market";
}

export type ArticleEnregistre = {
  id: string;
  ingredientId: string;
  ingredient: string;
  quantity: number;
  unit: string;
  estimatedPriceFcfa: number | null;
  placeType: PlaceType;
  checked: boolean;
};

export type ListeEnregistree = {
  id: string;
  mealPlanId: string;
  estimatedTotalFcfa: number;
  // Reste à dépenser : articles pas encore cochés
  remainingFcfa: number;
  sharedAt: string | null;
  items: ArticleEnregistre[];
};

const avecArticles = {
  items: {
    include: { ingredient: { select: { name: true } }, unit: true },
    orderBy: { createdAt: "asc" as const },
  },
};

type LigneListe = {
  id: string;
  mealPlanId: string;
  estimatedTotalFcfa: number;
  sharedAt: Date | null;
  items: {
    id: string;
    ingredientId: string;
    ingredient: { name: string };
    quantity: number;
    unit: { label: string };
    estimatedPriceFcfa: number | null;
    placeType: PlaceType;
    checked: boolean;
  }[];
};

function versListe(liste: LigneListe): ListeEnregistree {
  const items = liste.items.map((article) => ({
    id: article.id,
    ingredientId: article.ingredientId,
    ingredient: article.ingredient.name,
    quantity: article.quantity,
    unit: article.unit.label,
    estimatedPriceFcfa: article.estimatedPriceFcfa,
    placeType: article.placeType,
    checked: article.checked,
  }));
  return {
    id: liste.id,
    mealPlanId: liste.mealPlanId,
    estimatedTotalFcfa: liste.estimatedTotalFcfa,
    remainingFcfa: items
      .filter((a) => !a.checked)
      .reduce((total, a) => total + (a.estimatedPriceFcfa ?? 0), 0),
    sharedAt: liste.sharedAt?.toISOString() ?? null,
    items,
  };
}

function exigerFoyer(session: SessionVerifiee): string {
  if (!session.householdId) throw new ErreurApi("INTROUVABLE");
  return session.householdId;
}

type UniteAchat = { id: string; label: string; gramsEquivalent: number };

/** Unité d'achat : celle par défaut de l'ingrédient, sinon une des siennes, sinon celle de la recette. */
function uniteAchat(
  defaut: UniteAchat | null,
  unites: UniteAchat[],
  deLaRecette: UniteAchat,
): UniteAchat {
  return defaut ?? unites[0] ?? deLaRecette;
}

function chargerMenu(householdId: string, mealPlanId: string) {
  return prisma.mealPlan.findFirst({
    where: { id: mealPlanId, householdId },
    include: {
      // Seuls les repas encore prévus et cuisinés pour eux-mêmes demandent des courses :
      // un repas de restes réutilise les ingrédients du repas d'origine
      meals: {
        where: { status: "planned", leftoverFromId: null },
        include: {
          recipe: {
            include: {
              ingredients: {
                include: {
                  unit: true,
                  ingredient: {
                    include: {
                      defaultUnit: true,
                      units: { orderBy: { gramsEquivalent: "asc" } },
                      prices: { where: { city: VILLE }, include: { unit: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

/** (Re)génère la liste du menu : l'ancienne liste, cochages compris, est remplacée. */
export async function genererListe(
  session: SessionVerifiee,
  mealPlanId: string,
): Promise<ListeEnregistree> {
  const householdId = exigerFoyer(session);
  const [menu, stock] = await Promise.all([
    chargerMenu(householdId, mealPlanId),
    prisma.stockItem.findMany({
      where: { householdId, status: { in: ["ok", "useSoon"] } },
      include: { unit: true },
    }),
  ]);
  if (!menu) throw new ErreurApi("INTROUVABLE");

  const ingredients = new Map<string, IngredientPourListe>();
  const details = new Map<string, { unitId: string; categorie: string }>();
  for (const ligne of menu.meals.flatMap((r) => r.recipe.ingredients)) {
    const { ingredient } = ligne;
    if (ingredients.has(ingredient.id)) continue;
    const unite = uniteAchat(ingredient.defaultUnit, ingredient.units, ligne.unit);
    ingredients.set(ingredient.id, {
      name: ingredient.name,
      uniteAchat: { label: unite.label, grams: unite.gramsEquivalent },
      releves: ingredient.prices.map((prix) => ({
        priceFcfa: prix.priceFcfa,
        grams: prix.unit.gramsEquivalent,
        source: prix.source,
        observedAt: prix.observedAt,
        placeType: prix.placeType,
      })),
    });
    details.set(ingredient.id, { unitId: unite.id, categorie: ingredient.category });
  }

  const liste = listeDeCourses(
    menu.meals.map((repas) => ({
      servings: repas.servings,
      recette: {
        servings: repas.recipe.servings,
        ingredients: repas.recipe.ingredients.map((l) => ({
          ingredientId: l.ingredientId,
          grams: l.quantity * l.unit.gramsEquivalent,
          optional: l.optional,
        })),
      },
    })),
    stock.map((s) => ({
      ingredientId: s.ingredientId,
      grams: s.quantity * s.unit.gramsEquivalent,
    })),
    ingredients,
    new Date(),
  );

  const enregistree = await prisma.$transaction(async (tx) => {
    await tx.shoppingList.deleteMany({ where: { mealPlanId: menu.id, householdId } });
    return tx.shoppingList.create({
      data: {
        householdId,
        mealPlanId: menu.id,
        estimatedTotalFcfa: liste.totalFcfa,
        items: {
          create: liste.articles.map((article) => {
            const detail = details.get(article.ingredientId)!;
            return {
              ingredientId: article.ingredientId,
              unitId: detail.unitId,
              quantity: article.quantite,
              estimatedPriceFcfa: article.prixFcfa,
              placeType: article.placeType ?? lieuParDefaut(detail.categorie),
            };
          }),
        },
      },
      include: avecArticles,
    });
  });
  return versListe(enregistree);
}

/** Liste du foyer de la session, avec ses coûts. */
export async function lireListe(session: SessionVerifiee, id: string): Promise<ListeEnregistree> {
  const liste = await prisma.shoppingList.findFirst({
    where: { id, householdId: exigerFoyer(session) },
    include: avecArticles,
  });
  if (!liste) throw new ErreurApi("INTROUVABLE");
  return versListe(liste);
}

export type ListeDuMenuActif = { menuId: string; liste: ListeEnregistree | null };

/** Menu actif le plus récent du foyer de la session et sa liste ; null sans menu validé. */
export async function listeDuMenuActif(session: SessionVerifiee): Promise<ListeDuMenuActif | null> {
  if (!session.householdId) return null;
  const menu = await prisma.mealPlan.findFirst({
    where: { householdId: session.householdId, status: "active" },
    orderBy: { weekStart: "desc" },
    include: { shoppingList: { include: avecArticles } },
  });
  if (!menu) return null;
  return { menuId: menu.id, liste: menu.shoppingList ? versListe(menu.shoppingList) : null };
}

/** Coche ou décoche un article d'une liste du foyer de la session. */
export async function cocherArticle(
  session: SessionVerifiee,
  listId: string,
  itemId: string,
  checked: boolean,
): Promise<ListeEnregistree> {
  const householdId = exigerFoyer(session);
  const { count } = await prisma.shoppingListItem.updateMany({
    where: { id: itemId, listId, list: { householdId } },
    data: { checked },
  });
  if (count === 0) throw new ErreurApi("INTROUVABLE");
  return lireListe(session, listId);
}
