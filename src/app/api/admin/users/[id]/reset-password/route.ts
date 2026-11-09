import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { hacherMotDePasse } from "@/lib/auth/motdepasse";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { resetPasswordSchema } from "@/lib/validation/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(requete: Request, { params }: Params) {
  try {
    await exigerAdmin();
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const utilisateur = await prisma.user.findUnique({ where: { id } });
    if (!utilisateur) throw new ErreurApi("INTROUVABLE");

    const { newPassword } = resetPasswordSchema.parse(await requete.json());
    const hash = await hacherMotDePasse(newPassword);

    await prisma.user.update({
      where: { id },
      data: { passwordHash: hash },
    });

    return NextResponse.json({ reset: true });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
