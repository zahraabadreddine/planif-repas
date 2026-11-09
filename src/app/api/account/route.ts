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
