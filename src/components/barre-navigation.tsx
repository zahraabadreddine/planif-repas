"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./barre-navigation.module.css";

const onglets = [
  { href: "/accueil", libelle: "Accueil", icone: "M3 11l9-7 9 7M5 10v10h14V10" },
  {
    href: "/menu",
    libelle: "Menu",
    icone: "M7 5h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM4 10h16M9 3v4M15 3v4",
  },
  { href: "/courses", libelle: "Courses", icone: "M5 8h14l-1.5 11h-11zM9 8a3 3 0 0 1 6 0" },
  {
    href: "/stock",
    libelle: "Stock",
    icone: "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM6 10h12M9 6v2M9 13v3",
  },
  { href: "/chat", libelle: "Chat", icone: "M4 5h16v11H9l-5 4z" },
] as const;

export default function BarreNavigation() {
  const cheminActuel = usePathname();

  return (
    <nav className={styles.barre} aria-label="Navigation principale">
      {onglets.map((onglet) => {
        const actif = cheminActuel.startsWith(onglet.href);
        return (
          <Link
            key={onglet.href}
            href={onglet.href}
            className={actif ? `${styles.onglet} ${styles.actif}` : styles.onglet}
            aria-current={actif ? "page" : undefined}
          >
            <span className={styles.pastille}>
              <svg
                className={styles.icone}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={onglet.icone} />
              </svg>
            </span>
            {onglet.libelle}
          </Link>
        );
      })}
    </nav>
  );
}
