import styles from "./titre-page.module.css";

export default function TitrePage({ children }: { children: string }) {
  return <h1 className={styles.titre}>{children}</h1>;
}
