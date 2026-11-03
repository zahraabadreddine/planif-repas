import { z } from "zod";

// Partage du foyer avec un code d'invitation (EF-03). Constantes et règles sans accès à la base,
// utilisables par les routes comme par les écrans.

export const LONGUEURCODE = 6;
/** Sans 0, O, 1, I ni L : impossibles à confondre en recopiant le code. */
export const ALPHABETCODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** Un code est valable 48 h. */
export const DUREEINVITATIONMS = 48 * 60 * 60 * 1000;
/** Codes en attente au maximum par foyer. */
export const INVITATIONSMAX = 5;

export type Acces = "edit" | "view";

export const ACCES: readonly { valeur: Acces; libelle: string; detail: string }[] = [
  { valeur: "edit", libelle: "Peut modifier", detail: "Menus, courses, stock et membres" },
  { valeur: "view", libelle: "Peut seulement voir", detail: "Consulte sans rien changer" },
];

/** « k7m-4pq » ou « K7M 4PQ » → « K7M4PQ ». */
export function normaliserCode(saisie: string): string {
  return saisie.toUpperCase().replace(/[\s-]/g, "");
}

/** « K7M4PQ » → « K7M 4PQ », plus facile à lire et à recopier. */
export function afficherCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/** Message WhatsApp envoyé à la personne invitée. Le code y figure, jamais l'identifiant du foyer. */
export function texteInvitation(nomFoyer: string, code: string, adresse: string): string {
  return [
    `Rejoins notre foyer « ${nomFoyer} » sur Umami !`,
    `1. Crée ton compte ou connecte-toi : ${adresse}`,
    "2. Va dans Mon foyer, puis « Rejoindre un foyer »",
    `3. Tape le code : ${afficherCode(code)}`,
    "Le code marche une seule fois, pendant 48 h.",
  ].join("\n");
}

const acces = z.enum(["edit", "view"], { error: "Choisis ce que la personne pourra faire." });

// strictObject : le foyer vient de la session, jamais de la requête.
export const accesSchema = z.strictObject({ access: acces });

export const rejoindreSchema = z.strictObject({
  code: z
    .string({ error: "Tape le code reçu." })
    .transform(normaliserCode)
    .pipe(
      z.string().regex(new RegExp(`^[A-Z0-9]{${LONGUEURCODE}}$`), {
        error: `Le code a ${LONGUEURCODE} caractères.`,
      }),
    ),
});
export type Rejoindre = z.input<typeof rejoindreSchema>;
