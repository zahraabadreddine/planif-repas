import type { ProposalStatus, ProposalType } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi } from "@/lib/erreurs";
import { enregistrerFoyer, lireFoyer } from "@/lib/foyer/profil";
import { activerMenu } from "@/lib/planificateur/generation";
import {
  changerPortions,
  remplacerRepas,
  reorganiserUrgence,
} from "@/lib/planificateur/modification";
import { PORTIONSMAX } from "@/lib/validation/repas";
import { declarerAchats } from "@/lib/stock/achats";
import type { ArticleAchat } from "@/lib/validation/stock";
import { CUISINES, foyerSchema, type Cuisine } from "@/lib/validation/foyer";
import { erreursParChamp } from "@/lib/validation/compte";
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

// Une seule sorte de changement par proposition : la recette ou les portions (EF-07)
const mealChangePayload = z
  .object({
    repasId: z.string().uuid("Identifiant du repas manquant."),
    nouvelleRecetteId: z.string().uuid("Identifiant de la recette manquant.").optional(),
    portions: z.number().int().min(1).max(PORTIONSMAX).optional(),
  })
  .refine((p) => (p.nouvelleRecetteId === undefined) !== (p.portions === undefined));

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
  options: z.array(z.object({ recetteId: z.string(), titre: z.string() })).optional(),
});

function validerPayload<T>(schema: z.ZodType<T>, payload: unknown): T {
  const resultat = schema.safeParse(payload);
  if (!resultat.success) {
    throw new ErreurApi("DONNEESINVALIDES", "Contenu de la proposition invalide.");
  }
  return resultat.data;
}

const EXPIRATIONHEURES = 24;

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
  expiresAt.setHours(expiresAt.getHours() + EXPIRATIONHEURES);

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
    throw new ErreurApi("DONNEESINVALIDES", MESSAGESTATUT[proposition.status]);
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

/** Ce que la famille lit quand elle répond à une carte qui n'est plus en attente. */
const MESSAGESTATUT: Record<Exclude<ProposalStatus, "pending">, string> = {
  accepted: "Cette proposition a déjà été confirmée.",
  rejected: "Cette proposition a déjà été refusée.",
  expired: "Cette proposition a été remplacée par une plus récente, ou a expiré.",
};

/** Rejette une proposition (status → rejected). */
export async function rejeterProposition(
  session: SessionVerifiee,
  id: string,
): Promise<{ id: string; status: "rejected" }> {
  const proposition = await chargerProposition(session, id);
  const { count } = await prisma.agentProposal.updateMany({
    where: { id: proposition.id, status: "pending" },
    data: { status: "rejected" },
  });
  if (count === 0) throw new ErreurApi("DONNEESINVALIDES", "Cette proposition a déjà été traitée.");
  return { id: proposition.id, status: "rejected" };
}

/**
 * Accepte une proposition : le code revérifie tout avant d'appliquer (règle 1).
 * Chaque type a sa logique d'application propre.
 */
/** Choix de la famille au moment de confirmer (le plat d'urgence parmi les options proposées). */
export type ChoixConfirmation = { recetteId?: string };

export async function accepterProposition(
  session: SessionVerifiee,
  id: string,
  choix: ChoixConfirmation = {},
): Promise<{ id: string; status: "accepted"; resultat: Record<string, unknown> }> {
  const proposition = await chargerProposition(session, id);
  const appliquer = preparerApplication(session, proposition.type, proposition.payload, choix);

  // Réservée avant d'être appliquée : un second clic trouve la proposition déjà prise
  // et n'applique rien une deuxième fois (des achats ne sont jamais comptés deux fois).
  const { count } = await prisma.agentProposal.updateMany({
    where: { id: proposition.id, status: "pending" },
    data: { status: "accepted" },
  });
  if (count === 0) throw new ErreurApi("DONNEESINVALIDES", "Cette proposition a déjà été traitée.");

  try {
    return { id: proposition.id, status: "accepted", resultat: await appliquer() };
  } catch (erreur) {
    // L'application a échoué (allergie, budget…) : la famille peut réessayer ou refuser.
    await prisma.agentProposal.updateMany({
      where: { id: proposition.id, status: "accepted" },
      data: { status: "pending" },
    });
    throw erreur;
  }
}

/** Valide le contenu de la proposition avant toute écriture, et renvoie son application. */
function preparerApplication(
  session: SessionVerifiee,
  type: ProposalType,
  payload: unknown,
  choix: ChoixConfirmation,
): () => Promise<Record<string, unknown>> {
  switch (type) {
    case "profileUpdate": {
      const donnees = validerPayload(profileUpdatePayload, payload);
      return () => appliquerProfileUpdate(session, donnees);
    }
    case "weekPlan": {
      const donnees = validerPayload(weekPlanPayload, payload);
      return () => appliquerWeekPlan(session, donnees);
    }
    case "mealChange": {
      const donnees = validerPayload(mealChangePayload, payload);
      return () => appliquerMealChange(session, donnees);
    }
    case "purchase": {
      const donnees = validerPayload(purchasePayload, payload);
      return () => appliquerPurchase(session, donnees);
    }
    case "emergency": {
      const option = optionChoisie(validerPayload(emergencyPayload, payload), choix);
      return () => appliquerEmergency(session, option);
    }
    default:
      throw new ErreurApi("DONNEESINVALIDES", "Type de proposition inconnu.");
  }
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
    shoppingDay: payload.shoppingDay !== undefined ? payload.shoppingDay : foyer.shoppingDay,
  };

  // Mêmes règles que le formulaire du foyer (nom, budget, cuisines, jour des courses)
  const verifie = foyerSchema.safeParse(donnees);
  if (!verifie.success) {
    throw new ErreurApi(
      "DONNEESINVALIDES",
      "Cette modification du foyer n'est pas valable.",
      erreursParChamp(verifie.error),
    );
  }
  const { foyer: mis } = await enregistrerFoyer(session, verifie.data);
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
  // Le code recalcule et revérifie toute la semaine (allergies, budget, restes) avant d'enregistrer
  const { menu } =
    payload.portions !== undefined
      ? await changerPortions(session, payload.repasId, payload.portions)
      : await remplacerRepas(session, payload.repasId, payload.nouvelleRecetteId!);
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

type OptionUrgence = { recetteId: string; titre: string };

/**
 * Le plat choisi par la famille parmi les options proposées par l'agent (la première par défaut).
 * Un plat qui ne fait pas partie de la proposition est refusé : le choix reste dans ce que le code a vérifié.
 */
function optionChoisie(
  payload: z.infer<typeof emergencyPayload>,
  choix: ChoixConfirmation,
): OptionUrgence {
  const options = payload.options ?? [];
  if (options.length === 0) throw new ErreurApi("DONNEESINVALIDES", "Aucune option d'urgence.");
  if (!choix.recetteId) return options[0];
  const option = options.find((o) => o.recetteId === choix.recetteId);
  if (!option) {
    throw new ErreurApi("DONNEESINVALIDES", "Ce plat ne fait pas partie des options proposées.");
  }
  return option;
}

async function appliquerEmergency(
  session: SessionVerifiee,
  recetteChoisie: OptionUrgence,
): Promise<Record<string, unknown>> {
  // Même réorganisation que l'écran d'urgence : le dîner prévu glisse au lendemain (§11)
  const resultat = await reorganiserUrgence(session, recetteChoisie.recetteId);

  return {
    message: `${recetteChoisie.titre} ce soir. ${resultat.message}`,
    menuId: resultat.menu.id,
    listeId: resultat.liste?.id ?? null,
    ancienneRecette: resultat.ancienneRecette,
    nouvelleRecette: recetteChoisie.titre,
    decale: resultat.decale,
  };
}
