import type { ProposalType } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { enregistrerFoyer, lireFoyer } from "@/lib/foyer/profil";
import { activerMenu } from "@/lib/planificateur/generation";
import { remplacerRepas } from "@/lib/planificateur/modification";
import { declarerAchats } from "@/lib/stock/achats";
import type { ArticleAchat } from "@/lib/validation/stock";
import type { Cuisine } from "@/lib/validation/foyer";
import type { Prisma } from "@prisma/client";

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
  const payload = proposition.payload as Record<string, unknown>;

  let resultat: Record<string, unknown>;

  switch (proposition.type) {
    case "profileUpdate":
      resultat = await appliquerProfileUpdate(session, payload);
      break;
    case "weekPlan":
      resultat = await appliquerWeekPlan(session, payload);
      break;
    case "mealChange":
      resultat = await appliquerMealChange(session, payload);
      break;
    case "purchase":
      resultat = await appliquerPurchase(session, payload);
      break;
    case "emergency":
      resultat = await appliquerEmergency(payload);
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
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const foyer = await lireFoyer(session);
  if (!foyer) throw new ErreurApi("FOYERMANQUANT");

  const donnees = {
    name: (payload.name as string) ?? foyer.name,
    weeklyBudgetFcfa: (payload.weeklyBudgetFcfa as number) ?? foyer.weeklyBudgetFcfa,
    cuisinesPreferred: (payload.cuisinesPreferred as Cuisine[]) ?? foyer.cuisinesPreferred,
    shoppingDay: payload.shoppingDay !== undefined
      ? (payload.shoppingDay as number | null)
      : foyer.shoppingDay,
  };

  const { foyer: mis } = await enregistrerFoyer(session, donnees);
  return { foyer: mis };
}

async function appliquerWeekPlan(
  session: SessionVerifiee,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const menuId = payload.menuId as string;
  if (!menuId) throw new ErreurApi("DONNEESINVALIDES", "Identifiant du menu manquant.");

  const { menu, liste } = await activerMenu(session, menuId);
  return { menuId: menu.id, listeId: liste.id };
}

async function appliquerMealChange(
  session: SessionVerifiee,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const repasId = payload.repasId as string;
  const recetteId = payload.nouvelleRecetteId as string;
  if (!repasId || !recetteId) {
    throw new ErreurApi("DONNEESINVALIDES", "Identifiants manquants pour le remplacement.");
  }

  const { menu } = await remplacerRepas(session, repasId, recetteId);
  return { menuId: menu.id };
}

async function appliquerPurchase(
  session: SessionVerifiee,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const items = payload.items as Array<{
    ingredientId: string;
    unitId: string;
    quantity: number;
    location: "fridge" | "freezer" | "pantry";
  }>;
  if (!items || items.length === 0) {
    throw new ErreurApi("DONNEESINVALIDES", "Aucun article à enregistrer.");
  }

  const articles: ArticleAchat[] = items.map((i) => ({
    ingredientId: i.ingredientId,
    unitId: i.unitId,
    quantity: i.quantity,
    location: i.location,
  }));

  const resultats = await declarerAchats(session, articles);
  return { articles: resultats.length };
}

async function appliquerEmergency(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const options = payload.options as Array<{ recetteId: string; titre: string }>;
  return {
    message: "Choix enregistré.",
    options: options?.map((o) => o.titre) ?? [],
  };
}
