import { compare, hash } from "bcryptjs";

// Coût bcrypt : 12 tours, bon compromis entre sécurité et temps de réponse (~250 ms).
const TOURSBCRYPT = 12;

/** Hache un mot de passe. Le mot de passe en clair n'est jamais stocké ni journalisé. */
export function hacherMotDePasse(motDePasse: string): Promise<string> {
  return hash(motDePasse, TOURSBCRYPT);
}

/** Vérifie un mot de passe en clair contre son empreinte, en temps constant. */
export function verifierMotDePasse(motDePasse: string, empreinte: string): Promise<boolean> {
  return compare(motDePasse, empreinte);
}
