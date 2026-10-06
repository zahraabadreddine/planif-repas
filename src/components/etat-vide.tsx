import Link from "next/link";
import styles from "./etat-vide.module.css";

type Props = {
  titre: string;
  message: string;
  action?: { href: string; libelle: string };
};

export default function EtatVide({ titre, message, action }: Props) {
  return (
    <section className={styles.carte}>
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
      <h2 className={styles.titre}>{titre}</h2>
      <p className={styles.message}>{message}</p>
      {action && (
        <Link href={action.href} className={styles.action}>
          {action.libelle}
        </Link>
      )}
    </section>
  );
}
