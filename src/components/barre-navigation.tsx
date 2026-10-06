"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./barre-navigation.module.css";

const onglets = [
  { href: "/accueil", libelle: "Accueil", icone: "M3 11 12 4l9 7v9h-6v-6H9v6H3z" },
  { href: "/menu", libelle: "Menu", icone: "M4 5h16v15H4zM4 9h16M9 3v4M15 3v4" },
  { href: "/courses", libelle: "Courses", icone: "M3 5h3l2 11h11l2-8H7M10 20h.01M17 20h.01" },
  { href: "/stock", libelle: "Stock", icone: "M5 3h14v18H5zM5 10h14M9 6v1M9 13v2" },
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
            {onglet.libelle}
          </Link>
        );
      })}
    </nav>
  );
}
