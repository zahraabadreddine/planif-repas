"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { TruckIcon } from "@/components/icones";

export function ChauffeurShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-creme">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b-[2.5px] border-foret bg-[#FFFDF7] px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <TruckIcon size={20} className="text-sirop" />
          <Link href="/chauffeur" className="retro text-lg text-foret">
            UMAMI
          </Link>
          <span className="rounded-full bg-sirop/15 px-2 py-0.5 text-[10px] font-bold text-sirop">
            Chauffeur
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/connexion" })}
          className="rounded-[10px_14px_12px_8px] bg-carmin/10 px-3 py-1.5 text-xs font-bold text-carmin transition-colors hover:bg-carmin/20"
        >
          Déconnexion
        </button>
      </header>

      <main className="px-5 pb-10 pt-6">{children}</main>
    </div>
  );
}
