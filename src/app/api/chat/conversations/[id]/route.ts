import { NextRequest, NextResponse } from "next/server";
import { exigerSession } from "@/lib/auth/garde";
import { gererErreur, ErreurApi } from "@/lib/erreurs";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await exigerSession();
    if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

    const { id } = await params;

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

    return NextResponse.json({
      id: conversation.id,
      mode: conversation.mode,
      createdAt: conversation.createdAt,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
