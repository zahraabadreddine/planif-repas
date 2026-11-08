import type { ProposalType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { enregistrerFoyer, lireFoyer } from "@/lib/foyer/profil";
import { activerMenu } from "@/lib/planificateur/generation";
import { remplacerRepas } from "@/lib/planificateur/modification";
import { declarerAchats } from "@/lib/stock/achats";
import type { ArticleAchat } from "@/lib/validation/stock";
import { CUISINES, type Cuisine } from "@/lib/validation/foyer";
import type { Prisma } from "@prisma/client";

const valeursCuisines = CUISINES.map((c) => c.valeur) as [Cuisine, ...Cuisine[]];

const profileUpdatePayload = z.object({
  name: z.string().min(1).max(50).optional(),
  weeklyBudgetFcfa: z.number().int().positive().optional(),
  cuisinesPreferred: z.array(z.enum(valeursCuisines)).optional(),
  shoppingDay: z.number().int().min(1).max(7).nullable().optional(),
});

const weekPlanPayload = z.object({
  menuId: z.string().uuid("Identifiant du menu manquant."),
});

const mealChangePayload = z.object({
  repasId: z.string().uuid("Identifiant du repas manquant."),
  nouvelleRecetteId: z.string().uuid("Identifiant de la recette manquant."),
});

const purchasePayload = z.object({
  items: z
    .array(
      z.object({
        ingredientId: z.string().uuid(),
        unitId: z.string().uuid(),
        quantity: z.number().positive(),
        location: z.enum(["fridge", "freezer", "pantry"]),
      }),
    )
    .min(1, "Aucun article à enregistrer."),
});

const emergencyPayload = z.object({
  options: z
    .array(z.object({ recetteId: z.string(), titre: z.string() }))
    .optional(),
});

function validerPayload<T>(schema: z.ZodType<T>, payload: unknown): T {
  const resultat = schema.safeParse(payload);
  if (!resultat.success) {
    throw new ErreurApi("DONNEESINVALIDES", "Contenu de la proposition invalide.");
  }
  return resultat.data;
}

const EXPIRATION_HEURES = 24;

export type PropositionCreee = {
  id: string;
  type: ProposalType;
  status: "pending";
  expiresAt: string;
};

/**
 * Crée une proposition en attente de confirmation par la famille.
 * L'agent propose, le code vérifie, la famille confirme (règle 1).
 */
export async function creerProposition(
  conversationId: string,
  type: ProposalType,
  payload: Record<string, unknown>,
): Promise<PropositionCreee> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + EXPIRATION_HEURES);

  const proposition = await prisma.agentProposal.create({
    data: {
      conversationId,
      type,
      payload: payload as Prisma.InputJsonValue,
      expiresAt,
    },
  });

  return {
    id: proposition.id,
    type: proposition.type,
    status: "pending",
    expiresAt: proposition.expiresAt.toISOString(),
  };
}

type PropositionAvecFoyer = {
  id: string;
  type: ProposalType;
  status: string;
  expiresAt: Date;
  payload: unknown;
  conversation: { householdId: string };
};

/**
 * Charge une proposition pending appartenant au foyer de la session.
 * Vérifie que la proposition n'est pas expirée (règle 1).
 */
export async function chargerProposition(
  session: SessionVerifiee,
  id: string,
): Promise<PropositionAvecFoyer> {
  if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

  const proposition = await prisma.agentProposal.findUnique({
    where: { id },
    include: { conversation: { select: { householdId: true } } },
  });

  if (!proposition || proposition.conversation.householdId !== session.householdId) {
    throw new ErreurApi("INTROUVABLE");
  }
  if (proposition.status !== "pending") {
    throw new ErreurApi("DONNEESINVALIDES", "Cette proposition a déjà été traitée.");
  }
  if (proposition.expiresAt < new Date()) {
    await prisma.agentProposal.update({
      where: { id },
      data: { status: "expired" },
    });
    throw new ErreurApi("DONNEESINVALIDES", "Cette proposition a expiré.");
  }

  return proposition as PropositionAvecFoyer;
}

/** Rejette une proposition (status → rejected). */
export async function rejeterProposition(
  session: SessionVerifiee,
  id: string,
): Promise<{ id: string; status: "rejected" }> {
  const proposition = await chargerProposition(session, id);
  await prisma.agentProposal.update({
    where: { id: proposition.id },
    data: { status: "rejected" },
  });
  return { id: proposition.id, status: "rejected" };
}

/**
 * Accepte une proposition : le code revérifie tout avant d'appliquer (règle 1).
 * Chaque type a sa logique d'application propre.
 */
export async function accepterProposition(
  session: SessionVerifiee,
  id: string,
): Promise<{ id: string; status: "accepted"; resultat: Record<string, unknown> }> {
  const proposition = await chargerProposition(session, id);
  const payload = proposition.payload;

  let resultat: Record<string, unknown>;

  switch (proposition.type) {
    case "profileUpdate":
      resultat = await appliquerProfileUpdate(session, validerPayload(profileUpdatePayload, payload));
      break;
    case "weekPlan":
      resultat = await appliquerWeekPlan(session, validerPayload(weekPlanPayload, payload));
      break;
    case "mealChange":
      resultat = await appliquerMealChange(session, validerPayload(mealChangePayload, payload));
      break;
    case "purchase":
      resultat = await appliquerPurchase(session, validerPayload(purchasePayload, payload));
      break;
    case "emergency":
      resultat = await appliquerEmergency(validerPayload(emergencyPayload, payload));
      break;
    default:
      throw new ErreurApi("DONNEESINVALIDES", "Type de proposition inconnu.");
  }

  await prisma.agentProposal.update({
    where: { id: proposition.id },
    data: { status: "accepted" },
  });

  return { id: proposition.id, status: "accepted", resultat };
}

async function appliquerProfileUpdate(
  session: SessionVerifiee,
  payload: z.infer<typeof profileUpdatePayload>,
): Promise<Record<string, unknown>> {
  const foyer = await lireFoyer(session);
  if (!foyer) throw new ErreurApi("FOYERMANQUANT");

  const donnees = {
    name: payload.name ?? foyer.name,
    weeklyBudgetFcfa: payload.weeklyBudgetFcfa ?? foyer.weeklyBudgetFcfa,
    cuisinesPreferred: payload.cuisinesPreferred ?? foyer.cuisinesPreferred,
    shoppingDay: payload.shoppingDay !== undefined
      ? payload.shoppingDay
      : foyer.shoppingDay,
  };

  const { foyer: mis } = await enregistrerFoyer(session, donnees);
  return { foyer: mis };
}

async function appliquerWeekPlan(
  session: SessionVerifiee,
  payload: z.infer<typeof weekPlanPayload>,
): Promise<Record<string, unknown>> {
  const { menu, liste } = await activerMenu(session, payload.menuId);
  return { menuId: menu.id, listeId: liste.id };
}

async function appliquerMealChange(
  session: SessionVerifiee,
  payload: z.infer<typeof mealChangePayload>,
): Promise<Record<string, unknown>> {
  const { menu } = await remplacerRepas(session, payload.repasId, payload.nouvelleRecetteId);
  return { menuId: menu.id };
}

async function appliquerPurchase(
  session: SessionVerifiee,
  payload: z.infer<typeof purchasePayload>,
): Promise<Record<string, unknown>> {
  const articles: ArticleAchat[] = payload.items.map((i) => ({
    ingredientId: i.ingredientId,
    unitId: i.unitId,
    quantity: i.quantity,
    location: i.location,
  }));

  const resultats = await declarerAchats(session, articles);
  return { articles: resultats.length };
}

async function appliquerEmergency(
  payload: z.infer<typeof emergencyPayload>,
): Promise<Record<string, unknown>> {
  return {
    message: "Choix enregistré.",
    options: payload.options?.map((o) => o.titre) ?? [],
  };
}
