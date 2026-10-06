import type { ReactNode } from "react";
import BarreNavigation from "@/components/barre-navigation";
import BoutonUrgence from "@/components/bouton-urgence";
import styles from "./layout.module.css";

export default function LayoutFamille({ children }: { children: ReactNode }) {
  return (
    <div className={styles.cadre}>
      <header className={styles.entete}>
        <span className={styles.marque}>Planif Repas</span>
        <BoutonUrgence />
      </header>
      <main className={styles.contenu}>{children}</main>
      <BarreNavigation />
    </div>
  );
}
