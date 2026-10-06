import Link from "next/link";
import styles from "./bouton-urgence.module.css";

export default function BoutonUrgence() {
  return (
    <Link href="/chat?mode=urgence" className={styles.bouton}>
      <svg
        className={styles.icone}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2 2M10 2h4" />
      </svg>
      Pas le temps
    </Link>
  );
}
