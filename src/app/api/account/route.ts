import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { exigerSession } from "@/lib/auth/garde";
import { verifierMotDePasse } from "@/lib/auth/motdepasse";
import { lireCorps } from "@/lib/validation/requete";

const suppressionSchema = z.object({
  password: z.string().min(1, { error: "Le mot de passe est obligatoire." }),
});

/** GET /api/account : renvoie les infos du compte connecté. */
export async function GET() {
  try {
    const { userId } = await exigerSession();
    const utilisatrice = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
        householdId: true,
        consentHealthAt: true,
        consentLocationAt: true,
      },
    });
    if (!utilisatrice) throw new ErreurApi("NONCONNECTE");
    return NextResponse.json({ account: utilisatrice });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

/** DELETE /api/account : supprime le compte de l'utilisatrice connectée (ENF-16). */
export async function DELETE(requete: Request) {
  try {
    const { userId } = await exigerSession();
    const { password } = await lireCorps(requete, suppressionSchema);

    const utilisatrice = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!utilisatrice) throw new ErreurApi("NONCONNECTE");

    if (!(await verifierMotDePasse(password, utilisatrice.passwordHash))) {
      throw new ErreurApi("MOTDEPASSEINCORRECT", undefined, {
        password: "Le mot de passe est incorrect.",
      });
    }

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ ok: true });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
