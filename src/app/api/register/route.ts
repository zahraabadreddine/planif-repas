import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { hacherMotDePasse } from "@/lib/auth/motdepasse";
import { inscriptionSchema } from "@/lib/validation/compte";
import { lireCorps } from "@/lib/validation/requete";

/** POST /api/register : crée un compte (EF-01). Le foyer est créé plus tard, avec l'agent ou le formulaire. */
export async function POST(requete: Request) {
  try {
    const donnees = await lireCorps(requete, inscriptionSchema);

    const existante = await prisma.user.findUnique({
      where: { email: donnees.email },
      select: { id: true },
    });
    if (existante) throw new ErreurApi("EMAILDEJAPRIS");

    const maintenant = new Date();
    const utilisatrice = await prisma.user.create({
      data: {
        email: donnees.email,
        fullName: donnees.fullName,
        passwordHash: await hacherMotDePasse(donnees.password),
        consentHealthAt: donnees.consentHealth ? maintenant : null,
        consentLocationAt: donnees.consentLocation ? maintenant : null,
      },
      select: { id: true, email: true, fullName: true },
    });

    return NextResponse.json({ user: utilisatrice }, { status: 201 });
  } catch (erreur) {
    // Deux inscriptions simultanées avec le même email : la contrainte d'unicité tranche.
    if (erreur instanceof Prisma.PrismaClientKnownRequestError && erreur.code === "P2002") {
      return gererErreur(new ErreurApi("EMAILDEJAPRIS"));
    }
    return gererErreur(erreur);
  }
}
