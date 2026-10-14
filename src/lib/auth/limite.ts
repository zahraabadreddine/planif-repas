// Limite des tentatives de connexion, en mémoire (pas de nouvelle dépendance).
// Limites connues : le compteur repart de zéro au redémarrage du serveur
// et ne vaut que pour une seule instance. Suffisant pour le MVP.

/** Nombre d'échecs autorisés par email dans la fenêtre. */
export const TENTATIVESMAX = 5;
/** Durée de la fenêtre : 15 minutes. */
export const FENETREMS = 15 * 60 * 1000;

type Compteur = { echecs: number; debut: number };

export function creerLimiteur(max = TENTATIVESMAX, fenetreMs = FENETREMS) {
  const compteurs = new Map<string, Compteur>();

  function compteurActif(cle: string, maintenant: number): Compteur | undefined {
    const compteur = compteurs.get(cle);
    if (compteur && maintenant - compteur.debut >= fenetreMs) {
      compteurs.delete(cle);
      return undefined;
    }
    return compteur;
  }

  return {
    /** Vrai si la clé a épuisé ses tentatives dans la fenêtre en cours. */
    estBloque(cle: string, maintenant = Date.now()): boolean {
      return (compteurActif(cle, maintenant)?.echecs ?? 0) >= max;
    },
    /** Enregistre un échec de connexion. */
    noterEchec(cle: string, maintenant = Date.now()): void {
      const compteur = compteurActif(cle, maintenant);
      if (compteur) compteur.echecs += 1;
      else compteurs.set(cle, { echecs: 1, debut: maintenant });
    },
    /** Une connexion réussie remet le compteur à zéro. */
    reinitialiser(cle: string): void {
      compteurs.delete(cle);
    },
  };
}

/** Limiteur partagé par la connexion. */
export const limiteConnexion = creerLimiteur();
