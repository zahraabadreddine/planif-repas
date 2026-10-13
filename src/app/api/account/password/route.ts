import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { exigerSession } from "@/lib/auth/garde";
import { hacherMotDePasse, verifierMotDePasse } from "@/lib/auth/motdepasse";
import { changementMotDePasseSchema } from "@/lib/validation/compte";
import { lireCorps } from "@/lib/validation/requete";

/** PUT /api/account/password : change le mot de passe de l'utilisatrice connectée (EF-01). */
export async function PUT(requete: Request) {
  try {
    const { userId } = await exigerSession();
    const { currentPassword, newPassword } = await lireCorps(requete, changementMotDePasseSchema);

    const utilisatrice = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!utilisatrice) throw new ErreurApi("NONCONNECTE");

    if (!(await verifierMotDePasse(currentPassword, utilisatrice.passwordHash))) {
      throw new ErreurApi("MOTDEPASSEINCORRECT", undefined, {
        currentPassword: "Le mot de passe actuel est incorrect.",
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hacherMotDePasse(newPassword) },
    });

    return NextResponse.json({ ok: true });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
