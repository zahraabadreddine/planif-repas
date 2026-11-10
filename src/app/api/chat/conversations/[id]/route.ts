import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";
import { prisma } from "@/lib/db";
import { construireTableSurnoms, restaurerSurnoms } from "@/lib/agent/context";
import { listerMembres } from "@/lib/foyer/membres";

export async function GET(requete: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await exigerSession();
    if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

    const { id } = await params;
    // Un identifiant mal formé ne peut désigner aucune conversation : introuvable.
    if (!z.uuid().safeParse(id).success) throw new ErreurApi("INTROUVABLE");

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation || conversation.householdId !== session.householdId) {
      throw new ErreurApi("INTROUVABLE");
    }

    // Les messages sont enregistrés anonymisés (« Enfant 1 ») : la famille revoit ses surnoms.
    const table = construireTableSurnoms(await listerMembres(session));

    return NextResponse.json({
      id: conversation.id,
      mode: conversation.mode,
      createdAt: conversation.createdAt,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: restaurerSurnoms(String(m.content), table),
        createdAt: m.createdAt,
      })),
    });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
