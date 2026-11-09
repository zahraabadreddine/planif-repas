import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { exigerSession, exigerEcriture } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";
import { prisma } from "@/lib/db";

// GET /api/preferences : liste les préférences apprises du foyer (EF-19).
export async function GET() {
  try {
    const session = await exigerSession();
    if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

    const preferences = await prisma.learnedPreference.findMany({
      where: { householdId: session.householdId },
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }],
    });

    return NextResponse.json(
      preferences.map((p) => ({
        id: p.id,
        key: p.key,
        value: p.value,
        confidence: p.confidence,
        explanation: p.explanation,
        source: p.source,
        active: p.active,
        updatedAt: p.updatedAt.toISOString(),
      })),
    );
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

const patchSchema = z
  .object({
    id: z.string().uuid(),
    active: z.boolean().optional(),
    value: z.string().min(1).max(500).optional(),
  })
  .refine((d) => d.active !== undefined || d.value !== undefined, {
    message: "Rien à modifier.",
  });

// PATCH /api/preferences : active/désactive ou modifie une préférence (EF-19).
export async function PATCH(request: NextRequest) {
  try {
    const session = await exigerEcriture();
    if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

    const corps = patchSchema.parse(await request.json());

    const pref = await prisma.learnedPreference.findUnique({
      where: { id: corps.id },
    });
    if (!pref || pref.householdId !== session.householdId) {
      throw new ErreurApi("INTROUVABLE");
    }

    const data: { active?: boolean; value?: string; source?: string } = {};
    if (corps.active !== undefined) data.active = corps.active;
    if (corps.value !== undefined) {
      data.value = corps.value;
      data.source = "user";
    }

    const mise = await prisma.learnedPreference.update({
      where: { id: corps.id },
      data,
    });

    return NextResponse.json({
      id: mise.id,
      key: mise.key,
      value: mise.value,
      confidence: mise.confidence,
      explanation: mise.explanation,
      source: mise.source,
      active: mise.active,
      updatedAt: mise.updatedAt.toISOString(),
    });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}

// DELETE /api/preferences?id=… : supprime une préférence (EF-19).
export async function DELETE(request: NextRequest) {
  try {
    const session = await exigerEcriture();
    if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

    const id = request.nextUrl.searchParams.get("id");
    if (!id) throw new ErreurApi("DONNEESINVALIDES", "Identifiant manquant.");

    const pref = await prisma.learnedPreference.findUnique({
      where: { id },
    });
    if (!pref || pref.householdId !== session.householdId) {
      throw new ErreurApi("INTROUVABLE");
    }

    await prisma.learnedPreference.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
