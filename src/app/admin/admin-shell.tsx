"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  HomeIcon,
  CalendarIcon,
  FridgeIcon,
  UserIcon,
  WalletIcon,
  MapIcon,
  TruckIcon,
  PackageIcon,
  MenuIcon,
  CloseIcon,
} from "@/components/icones";
import { UmamiLogo } from "@/components/logo";

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
  const [ouvert, setOuvert] = useState(false);

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  function fermer() {
    setOuvert(false);
  }

  const navContent = (
    <>
      <div className="flex items-center justify-between border-b-[2.5px] border-foret px-5 py-4">
        <Link href="/admin" onClick={fermer}>
          <UmamiLogo width={90} />
        </Link>
        <button
          onClick={fermer}
          className="lg:hidden rounded-lg p-1.5 text-cacao hover:bg-sable/60"
          aria-label="Fermer le menu"
        >
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
              onClick={fermer}
              className={
                "flex items-center gap-3 rounded-[10px_14px_12px_8px] px-3 py-2.5 text-sm font-bold transition-colors " +
                (active
                  ? "bg-foret text-creme shadow-[0_2px_0_#411102]"
                  : "text-cacao hover:bg-sable/60 hover:text-foret")
              }
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
    </>
  );

  return (
    <div className="min-h-dvh bg-creme">
      {/* Barre mobile + tablette */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b-[2.5px] border-foret bg-[#FFFDF7] px-4 py-3 lg:hidden">
        <Link href="/admin">
          <UmamiLogo width={80} />
        </Link>
        <button
          onClick={() => setOuvert(true)}
          className="rounded-lg p-2 text-foret hover:bg-sable/60"
          aria-label="Ouvrir le menu"
        >
          <MenuIcon size={24} />
        </button>
      </header>

      {/* Overlay mobile */}
      {ouvert && (
        <div
          className="fixed inset-0 z-50 bg-cacao/40 lg:hidden"
          onClick={fermer}
          aria-hidden="true"
        />
      )}

      {/* Sidebar mobile (slide) */}
      <nav
        className={
          "fixed left-0 top-0 z-50 flex h-dvh w-72 flex-col bg-[#FFFDF7] shadow-xl transition-transform duration-200 lg:hidden " +
          (ouvert ? "translate-x-0" : "-translate-x-full")
        }
      >
        {navContent}
      </nav>

      {/* Sidebar desktop */}
      <nav className="hidden lg:fixed lg:left-0 lg:top-0 lg:z-50 lg:flex lg:h-dvh lg:w-64 lg:flex-col lg:border-r-[2.5px] lg:border-foret lg:bg-[#FFFDF7]">
        {navContent}
      </nav>

      {/* Contenu principal */}
      <main className="px-4 pb-16 pt-6 lg:ml-64 lg:px-12 lg:pt-10">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
