import { z } from "zod";

// Schémas partagés par les routes API et les formulaires (inscription, connexion, mot de passe).

/** Longueur minimale d'un mot de passe. */
export const MOTDEPASSEMIN = 8;
/** bcrypt ne prend en compte que les 72 premiers octets : on refuse au-delà. */
export const MOTDEPASSEMAX = 72;

const email = z
  .string({ error: "L'email est obligatoire." })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Cet email n'est pas valide." }).max(254, { error: "Email trop long." }));

const nouveauMotDePasse = z
  .string({ error: "Le mot de passe est obligatoire." })
  .min(MOTDEPASSEMIN, { error: `Au moins ${MOTDEPASSEMIN} caractères.` })
  .refine((valeur) => new TextEncoder().encode(valeur).length <= MOTDEPASSEMAX, {
    error: "Mot de passe trop long.",
  });

export const inscriptionSchema = z.object({
  fullName: z
    .string({ error: "Ton nom est obligatoire." })
    .trim()
    .min(2, { error: "Ton nom est trop court." })
    .max(100, { error: "Ton nom est trop long." }),
  email,
  password: nouveauMotDePasse,
  // Consentements refusables (section 13) : on enregistre seulement la date s'ils sont acceptés.
  consentHealth: z.boolean(),
  consentLocation: z.boolean(),
});
export type Inscription = z.infer<typeof inscriptionSchema>;

/** Le formulaire ajoute une confirmation du mot de passe, vérifiée seulement côté navigateur. */
export const formulaireInscriptionSchema = inscriptionSchema
  .extend({ confirmation: z.string() })
  .refine((donnees) => donnees.password === donnees.confirmation, {
    error: "Les deux mots de passe ne sont pas identiques.",
    path: ["confirmation"],
  });
export type FormulaireInscription = z.infer<typeof formulaireInscriptionSchema>;

export const connexionSchema = z.object({
  email,
  password: z
    .string()
    .min(1, { error: "Le mot de passe est obligatoire." })
    .max(MOTDEPASSEMAX * 4),
});
export type Connexion = z.infer<typeof connexionSchema>;

export const changementMotDePasseSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Ton mot de passe actuel est obligatoire." }),
    newPassword: nouveauMotDePasse,
  })
  .refine((donnees) => donnees.currentPassword !== donnees.newPassword, {
    error: "Le nouveau mot de passe doit être différent de l'actuel.",
    path: ["newPassword"],
  });
export type ChangementMotDePasse = z.infer<typeof changementMotDePasseSchema>;

/** Transforme les erreurs zod en { champ: message } pour le format d'erreur commun. */
export function erreursParChamp(erreur: z.ZodError): Record<string, string> {
  const champs: Record<string, string> = {};
  for (const probleme of erreur.issues) {
    const cle = probleme.path.join(".") || "formulaire";
    if (!(cle in champs)) champs[cle] = probleme.message;
  }
  return champs;
}
