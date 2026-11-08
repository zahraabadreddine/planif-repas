import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerEcriture, type SessionVerifiee } from "@/lib/auth/garde";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { remplacerRepas } from "@/lib/planificateur/modification";
import { lireCorps } from "@/lib/validation/requete";

const emergencySchema = z.object({
  recipeId: z.string().uuid(),
});

async function trouverDinerCeSoir(session: SessionVerifiee) {
  const householdId = session.householdId;
  if (!householdId) throw new ErreurApi("FOYERMANQUANT");

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const demain = new Date(aujourdhui);
  demain.setDate(demain.getDate() + 1);

  const plan = await prisma.mealPlan.findFirst({
    where: { householdId, status: "active" },
    include: {
      meals: {
        include: { recipe: { select: { id: true, title: true } } },
      },
    },
    orderBy: { weekStart: "desc" },
  });

  if (!plan) {
    throw new ErreurApi("DONNEESINVALIDES", "Aucun menu actif. Génère d'abord un menu.");
  }

  const repasCeSoir = plan.meals.find(
    (m) =>
      m.slot === "dinner" &&
      m.status === "planned" &&
      m.date.getTime() >= aujourdhui.getTime() &&
      m.date.getTime() < demain.getTime(),
  );

  if (!repasCeSoir) {
    throw new ErreurApi("DONNEESINVALIDES", "Aucun dîner prévu ce soir à remplacer.");
  }

  return repasCeSoir;
}

export async function POST(requete: Request) {
  try {
    const session = await exigerEcriture();
    const { recipeId } = await lireCorps(requete, emergencySchema);

    const repasCeSoir = await trouverDinerCeSoir(session);
    const ancienTitre = repasCeSoir.recipe.title;

    const { menu, liste } = await remplacerRepas(session, repasCeSoir.id, recipeId);

    return NextResponse.json({
      plan: menu,
      list: liste,
      ancienneRecette: ancienTitre,
    });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
