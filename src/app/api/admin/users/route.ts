import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { gererErreur } from "@/lib/erreurs";

export async function GET() {
  try {
    await exigerAdmin();
    const utilisateurs = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users: utilisateurs });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
