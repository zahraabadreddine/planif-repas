import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";
import { hacherMotDePasse } from "@/lib/auth/motdepasse";

export async function GET() {
  try {
    await exigerAdmin();

    const chauffeurs = await prisma.driver.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { fullName: true, email: true } },
        _count: { select: { orders: { where: { status: { in: ["confirmed", "delivering"] } } } } },
      },
    });

    return NextResponse.json({ chauffeurs });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

const schemaCreation = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(6),
  commune: z.string().min(2),
  vehicle: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await exigerAdmin();
    const body = schemaCreation.parse(await request.json());

    const existant = await prisma.user.findUnique({ where: { email: body.email } });
    if (existant) throw new ErreurApi("DONNEESINVALIDES", "Cet email est déjà utilisé.");

    const passwordHash = await hacherMotDePasse(body.password);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: body.email,
          fullName: body.fullName,
          passwordHash,
          role: "driver",
        },
      });

      const driver = await tx.driver.create({
        data: {
          userId: user.id,
          phone: body.phone,
          commune: body.commune,
          vehicle: body.vehicle ?? "moto",
        },
      });

      return { user, driver };
    });

    return NextResponse.json(
      { id: result.driver.id, userId: result.user.id },
      { status: 201 },
    );
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
