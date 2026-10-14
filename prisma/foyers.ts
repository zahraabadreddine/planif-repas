// Création des quartiers, magasins, comptes et foyers de départ.
// Utilisé par seed.ts et par reinitialiser-demo.ts.

import type { PrismaClient } from "@prisma/client";
import { hacherMotDePasse } from "../src/lib/auth/motdepasse.ts";
import { MOTDEPASSEMAX, MOTDEPASSEMIN } from "../src/lib/validation/compte.ts";
import { ingredientsDepart, type Conservation } from "./donnees-depart.ts";
import type { CompteDepart, StockDepart } from "./donnees-foyers.ts";
import { magasinsDepart, quartiersDepart } from "./donnees-foyers.ts";

const unJour = 24 * 60 * 60 * 1000;

const dureeSelonRangement: Record<StockDepart["location"], keyof Conservation> = {
  fridge: "frigo",
  freezer: "congelateur",
  pantry: "ambiant",
};

/** Date d'achat et date de péremption d'un article : achat + durée de conservation du rangement. */
export function datesDuStock(ligne: StockDepart, maintenant: Date) {
  const ingredient = ingredientsDepart.find((i) => i.name === ligne.ingredient)!;
  const jours = ingredient.shelfLifeDays[dureeSelonRangement[ligne.location]];
  const addedAt = new Date(maintenant.getTime() - ligne.acheteIlYaJours * unJour);
  const expiresAt = jours === null ? null : new Date(addedAt.getTime() + jours * unJour);
  return { addedAt, expiresAt };
}

/** Mot de passe lu dans .env, avec les mêmes limites qu'à l'inscription ; null s'il manque. */
export function lireMotDePasse(variable: CompteDepart["motDePasse"]): string | null {
  const valeur = process.env[variable];
  if (!valeur) return null;
  const octets = new TextEncoder().encode(valeur).length;
  if (valeur.length < MOTDEPASSEMIN || octets > MOTDEPASSEMAX) {
    throw new Error(
      `${variable} doit contenir entre ${MOTDEPASSEMIN} et ${MOTDEPASSEMAX} caractères.`,
    );
  }
  return valeur;
}

type CleQuartier = string;
const cleQuartier = (q: { commune: string; name: string }): CleQuartier => `${q.commune}/${q.name}`;

/** Quartiers et magasins : retrouvés puis mis à jour, ou créés. */
export async function enregistrerQuartiersEtMagasins(prisma: PrismaClient) {
  const quartiers = new Map<CleQuartier, string>();
  for (const quartier of quartiersDepart) {
    const { id } = await prisma.neighborhood.upsert({
      where: { commune_name: { commune: quartier.commune, name: quartier.name } },
      update: { latitude: quartier.latitude, longitude: quartier.longitude },
      create: quartier,
    });
    quartiers.set(cleQuartier(quartier), id);
  }

  for (const { quartier, ...magasin } of magasinsDepart) {
    const neighborhoodId = quartiers.get(cleQuartier(quartier))!;
    const existant = await prisma.store.findFirst({
      where: { name: magasin.name, neighborhoodId },
    });
    if (existant) {
      await prisma.store.update({ where: { id: existant.id }, data: magasin });
    } else {
      await prisma.store.create({ data: { ...magasin, neighborhoodId } });
    }
  }
  return quartiers;
}

/** Unité d'un ingrédient retrouvée par son libellé : la sienne d'abord, sinon l'unité générique. */
async function trouverUnite(prisma: PrismaClient, ingredientId: string, label: string) {
  const propre = await prisma.marketUnit.findFirst({ where: { ingredientId, label } });
  return propre ?? (await prisma.marketUnit.findFirst({ where: { ingredientId: null, label } }))!;
}

export type ResultatCompte = "cree" | "existant" | "sansMotDePasse";

/**
 * Crée un compte et son foyer s'il n'existe pas encore. Un compte existant n'est pas modifié,
 * pour garder ce que l'équipe y a changé pendant les tests.
 */
export async function enregistrerCompte(
  prisma: PrismaClient,
  compte: CompteDepart,
  quartiers: Map<CleQuartier, string>,
  maintenant: Date,
): Promise<ResultatCompte> {
  const motDePasse = lireMotDePasse(compte.motDePasse);
  if (!motDePasse) return "sansMotDePasse";
  const existant = await prisma.user.findUnique({ where: { email: compte.email } });
  if (existant) return "existant";

  const passwordHash = await hacherMotDePasse(motDePasse);
  const { foyer } = compte;

  // Les unités du stock sont lues avant la transaction, qui ne fait ensuite qu'écrire.
  const stock = foyer
    ? await Promise.all(
        foyer.stock.map(async (ligne) => {
          const { id: ingredientId } = await prisma.ingredient.findUniqueOrThrow({
            where: { name: ligne.ingredient },
          });
          const unite = await trouverUnite(prisma, ingredientId, ligne.unit);
          return { ligne, ingredientId, unite };
        }),
      )
    : [];

  await prisma.$transaction(async (tx) => {
    const utilisatrice = await tx.user.create({
      data: {
        email: compte.email,
        fullName: compte.fullName,
        passwordHash,
        role: compte.role,
        consentHealthAt: compte.consentHealth ? maintenant : null,
      },
    });
    if (!foyer) return;

    const household = await tx.household.create({
      data: {
        ownerId: utilisatrice.id,
        name: foyer.name,
        weeklyBudgetFcfa: foyer.weeklyBudgetFcfa,
        equipment: foyer.equipment,
        neighborhoodId: foyer.quartier ? quartiers.get(cleQuartier(foyer.quartier)) : null,
        members: {
          create: foyer.members.map((membre) => ({
            label: membre.label,
            ageGroup: membre.ageGroup,
            restrictions: { create: membre.restrictions },
          })),
        },
      },
    });
    await tx.user.update({ where: { id: utilisatrice.id }, data: { householdId: household.id } });

    // Le stock n'est jamais écrit directement : chaque article naît d'un mouvement d'achat.
    for (const { ligne, ingredientId, unite } of stock) {
      await tx.stockItem.create({
        data: {
          householdId: household.id,
          ingredientId,
          unitId: unite.id,
          quantity: ligne.quantity,
          location: ligne.location,
          ...datesDuStock(ligne, maintenant),
          movements: {
            create: {
              type: "purchase",
              quantity: ligne.quantity,
              grams: ligne.quantity * unite.gramsEquivalent,
              reference: "Stock de départ du seed",
            },
          },
        },
      });
    }
  });
  return "cree";
}

const messages: Record<ResultatCompte, string> = {
  cree: "créé",
  existant: "déjà présent, non modifié",
  sansMotDePasse: "non créé (mot de passe absent du fichier .env)",
};

export function afficherResultat(email: string, resultat: ResultatCompte) {
  console.log(`  ${email} : ${messages[resultat]}`);
}
