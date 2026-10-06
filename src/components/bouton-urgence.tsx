import Link from "next/link";
import styles from "./bouton-urgence.module.css";

export default function BoutonUrgence() {
  return (
    <Link href="/chat?mode=urgence" className={styles.bouton}>
      Pas le temps
    </Link>
  );
}
