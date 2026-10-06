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
