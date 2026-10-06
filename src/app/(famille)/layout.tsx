import type { ReactNode } from "react";
import Link from "next/link";
import BarreNavigation from "@/components/barre-navigation";
import BoutonUrgence from "@/components/bouton-urgence";
import styles from "./layout.module.css";

export default function LayoutFamille({ children }: { children: ReactNode }) {
  return (
    <div className={styles.cadre}>
      <header className={styles.entete}>
        <Link href="/accueil" className={styles.marque}>
          <span className={styles.logo} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 11h16a8 8 0 0 1-16 0zM9 7c0-1.5 1-2 1-3.5M14 7c0-1.5 1-2 1-3.5" />
            </svg>
          </span>
          <span className={styles.nom}>Planif Repas</span>
        </Link>
        <BoutonUrgence />
      </header>
      <main className={styles.contenu}>{children}</main>
      <BarreNavigation />
    </div>
  );
}
