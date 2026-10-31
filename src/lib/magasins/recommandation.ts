import type { PlaceType, PriceSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { VILLE } from "@/lib/catalogue/recettes";
import { prixRetenu, type PrixRetenu } from "@/lib/courses/prix";
import { magasinsProches, type MagasinAvecDistance } from "./distance";

// Où acheter (CLAUDE.md §11, EF-12).
// Règle 3 : tout est calculé par le code.
// Règle 4 : le foyer vient de la session.

const SEUILECART = 0.1;
const MAGASINSPARLIEU = 3;

type PrixParLieu = { placeType: PlaceType; prix: PrixRetenu };

function prixParLieu(
  releves: {
    priceFcfa: number;
    grams: number;
    source: PriceSource;
    observedAt: Date;
    placeType: PlaceType;
  }[],
  maintenant: Date,
): PrixParLieu[] {
  const lieux: PlaceType[] = ["market", "supermarket", "shop"];
  const resultats: PrixParLieu[] = [];
  for (const lieu of lieux) {
    const duLieu = releves.filter((r) => r.placeType === lieu);
    const prix = prixRetenu(duLieu, maintenant);
    if (prix) resultats.push({ placeType: lieu, prix });
  }
  return resultats;
}

export type ArticleOuAcheter = {
  ingredientId: string;
  ingredient: string;
  placeType: PlaceType;
  quantity: number;
  unit: string;
  estimatedPriceFcfa: number | null;
};

export type LieuRecommande = {
  placeType: PlaceType;
  label: string;
  articles: ArticleOuAcheter[];
  magasins: MagasinAvecDistance[];
};

export type ResultatOuAcheter = {
  lieux: LieuRecommande[];
};

const LABELS: Record<PlaceType, string> = {
  market: "Marché",
  supermarket: "Supermarché",
  shop: "Boutique",
};

export async function ouAcheter(
  session: SessionVerifiee,
  listeId: string,
  lat?: number,
  lng?: number,
): Promise<ResultatOuAcheter> {
  if (!session.householdId) throw new ErreurApi("INTROUVABLE");

  const liste = await prisma.shoppingList.findFirst({
    where: { id: listeId, householdId: session.householdId },
    include: {
      items: {
        include: {
          ingredient: {
            include: {
              prices: {
                where: { city: VILLE },
                include: { unit: true },
              },
            },
          },
          unit: true,
        },
      },
      household: { include: { neighborhood: true } },
    },
  });
  if (!liste) throw new ErreurApi("INTROUVABLE");

  const maintenant = new Date();

  const articles: (ArticleOuAcheter & { lieuxPossibles: PrixParLieu[] })[] = liste.items.map(
    (item) => {
      const releves = item.ingredient.prices.map((p) => ({
        priceFcfa: p.priceFcfa,
        grams: p.unit.gramsEquivalent,
        source: p.source,
        observedAt: p.observedAt,
        placeType: p.placeType,
      }));
      return {
        ingredientId: item.ingredientId,
        ingredient: item.ingredient.name,
        placeType: item.placeType,
        quantity: item.quantity,
        unit: item.unit.label,
        estimatedPriceFcfa: item.estimatedPriceFcfa,
        lieuxPossibles: prixParLieu(releves, maintenant),
      };
    },
  );

  // Compter la majorité actuelle des articles par lieu
  const compteur = new Map<PlaceType, number>();
  for (const a of articles) {
    compteur.set(a.placeType, (compteur.get(a.placeType) ?? 0) + 1);
  }
  const lieuMajoritaire = [...compteur.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "market";

  // Pour chaque article avec plusieurs lieux possibles, choisir le meilleur
  for (const article of articles) {
    if (article.lieuxPossibles.length === 0) continue;
    const moinsCher = article.lieuxPossibles.reduce((a, b) =>
      b.prix.fcfaParKg < a.prix.fcfaParKg ? b : a,
    );
    const prixMajoritaire = article.lieuxPossibles.find((l) => l.placeType === lieuMajoritaire);
    if (
      prixMajoritaire &&
      prixMajoritaire.placeType !== moinsCher.placeType &&
      (prixMajoritaire.prix.fcfaParKg - moinsCher.prix.fcfaParKg) / moinsCher.prix.fcfaParKg <
        SEUILECART
    ) {
      article.placeType = lieuMajoritaire;
    } else {
      article.placeType = moinsCher.placeType;
    }
  }

  // Position de référence : téléphone si fourni, sinon centre du quartier
  let latRef: number;
  let lngRef: number;
  if (lat !== undefined && lng !== undefined) {
    latRef = lat;
    lngRef = lng;
  } else if (liste.household.neighborhood) {
    latRef = liste.household.neighborhood.latitude;
    lngRef = liste.household.neighborhood.longitude;
  } else {
    return {
      lieux: regrouperParLieu(articles, []),
    };
  }

  // Charger les magasins de chaque type de lieu concerné
  const typesUtilises = [...new Set(articles.map((a) => a.placeType))];
  const magasins = await prisma.store.findMany({
    where: {
      type: { in: typesUtilises },
      neighborhood: { commune: liste.household.neighborhood?.commune },
    },
  });

  const magasinsParType = new Map<PlaceType, MagasinAvecDistance[]>();
  for (const type of typesUtilises) {
    const duType = magasins.filter((m) => m.type === type);
    magasinsParType.set(type, magasinsProches(duType, latRef, lngRef, MAGASINSPARLIEU, maintenant));
  }

  return { lieux: regrouperParLieu(articles, [...magasinsParType.entries()]) };
}

function regrouperParLieu(
  articles: ArticleOuAcheter[],
  magasinsParType: [PlaceType, MagasinAvecDistance[]][],
): LieuRecommande[] {
  const magasinsMap = new Map(magasinsParType);
  const types: PlaceType[] = ["market", "supermarket", "shop"];
  return types
    .map((type) => {
      const duType = articles.filter((a) => a.placeType === type);
      if (duType.length === 0) return null;
      return {
        placeType: type,
        label: LABELS[type],
        articles: duType,
        magasins: magasinsMap.get(type) ?? [],
      };
    })
    .filter((l): l is LieuRecommande => l !== null);
}
