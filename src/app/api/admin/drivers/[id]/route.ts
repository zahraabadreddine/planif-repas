import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigerAdmin } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";

const schemaPatch = z.object({
  phone: z.string().min(6).optional(),
  commune: z.string().min(2).optional(),
  vehicle: z.string().optional(),
  status: z.enum(["available", "busy", "offline"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await exigerAdmin();
    const { id } = await params;
    const body = schemaPatch.parse(await request.json());

    const existant = await prisma.driver.findUnique({ where: { id } });
    if (!existant) throw new ErreurApi("INTROUVABLE");

    const updated = await prisma.driver.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(updated);
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await exigerAdmin();
    const { id } = await params;

    const existant = await prisma.driver.findUnique({ where: { id } });
    if (!existant) throw new ErreurApi("INTROUVABLE");

    await prisma.driver.delete({ where: { id } });
    await prisma.user.update({
      where: { id: existant.userId },
      data: { role: "user" },
    });

    return NextResponse.json({ ok: true });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
