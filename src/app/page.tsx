import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.titre}>Planif Repas</h1>
      <p className={styles.texte}>
        Votre assistant pour décider quoi cuisiner chaque jour, selon votre temps, votre budget en
        FCFA et ce qu&apos;il reste dans la cuisine.
      </p>
    </main>
  );
}
