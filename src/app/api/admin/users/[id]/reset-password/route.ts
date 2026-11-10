import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { hacherMotDePasse } from "@/lib/auth/motdepasse";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { resetPasswordSchema } from "@/lib/validation/admin";
import { lireCorps } from "@/lib/validation/requete";

type Params = { params: Promise<{ id: string }> };

/** POST /api/admin/users/:id/reset-password : l'admin donne un nouveau mot de passe (EF-28). */
export async function POST(requete: Request, { params }: Params) {
  try {
    await exigerAdmin();
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const utilisateur = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!utilisateur) throw new ErreurApi("INTROUVABLE");

    // Même règle et même hachage qu'à l'inscription (bcrypt, 72 octets au plus)
    const { newPassword } = await lireCorps(requete, resetPasswordSchema);
    await prisma.user.update({
      where: { id },
      data: { passwordHash: await hacherMotDePasse(newPassword) },
    });

    return NextResponse.json({ reset: true });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
