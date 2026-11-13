"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { cx } from "@/lib/format";
import {
  HomeIcon,
  CalendarIcon,
  CartIcon,
  FridgeIcon,
  UserIcon,
  WalletIcon,
  MapIcon,
  TruckIcon,
  PackageIcon,
  CloseIcon,
  ChartIcon,
} from "@/components/icones";

const NAV = [
  { href: "/admin", label: "Tableau de bord", icon: HomeIcon, exact: true },
  { href: "/admin/recettes", label: "Recettes", icon: CalendarIcon },
  { href: "/admin/ingredients", label: "Ingrédients", icon: FridgeIcon },
  { href: "/admin/prix", label: "Prix", icon: WalletIcon },
  { href: "/admin/magasins", label: "Magasins", icon: MapIcon },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: UserIcon },
  { href: "/admin/commandes", label: "Commandes", icon: PackageIcon },
  { href: "/admin/chauffeurs", label: "Chauffeurs", icon: TruckIcon },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="min-h-dvh bg-creme">
      {/* Top bar mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b-[2.5px] border-foret bg-[#FFFDF7] px-4 py-3 shadow-sm md:hidden">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-foret"
          aria-label="Ouvrir le menu"
        >
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          <span className="font-display text-sm font-bold">Admin</span>
        </button>
        <Link href="/admin" className="retro text-lg text-foret">UMAMI</Link>
      </header>

      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-foret/40 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={cx(
          "fixed left-0 top-0 z-50 flex h-dvh w-64 flex-col border-r-[2.5px] border-foret bg-[#FFFDF7] transition-transform duration-200 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b-[2.5px] border-foret px-5 py-4">
          <Link href="/admin" className="retro text-xl text-foret" onClick={() => setOpen(false)}>
            UMAMI
          </Link>
          <button onClick={() => setOpen(false)} className="text-cacao md:hidden" aria-label="Fermer">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, "exact" in item && item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cx(
                  "flex items-center gap-3 rounded-[10px_14px_12px_8px] px-3 py-2.5 text-sm font-bold transition-colors",
                  active
                    ? "bg-foret text-creme shadow-[0_2px_0_#411102]"
                    : "text-cacao hover:bg-sable/60 hover:text-foret",
                )}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="border-t-[2.5px] border-foret px-5 py-3">
          <p className="text-[11px] font-bold text-cacao">Administration</p>
          <button
            onClick={() => signOut({ callbackUrl: "/connexion" })}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[10px_14px_12px_8px] bg-carmin/10 px-3 py-2 text-xs font-bold text-carmin transition-colors hover:bg-carmin/20"
          >
            Déconnexion
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="px-5 pb-10 pt-6 md:ml-64">
        {children}
      </main>
    </div>
  );
}
