import { NextResponse } from "next/server";

// Format d'erreur unique de l'API : { error: { code, message } }.
// Les messages sont lisibles en français, sans détail technique ni donnée sensible.

export const ERREURS = {
  DONNEESINVALIDES: { status: 400, message: "Les informations envoyées ne sont pas valides." },
  NONCONNECTE: { status: 401, message: "Tu dois être connectée pour continuer." },
  INTERDIT: { status: 403, message: "Tu n'as pas accès à cette page." },
  INTROUVABLE: { status: 404, message: "Ce que tu cherches est introuvable." },
  EMAILDEJAPRIS: { status: 409, message: "Un compte existe déjà avec cet email." },
  MOTDEPASSEINCORRECT: { status: 400, message: "Le mot de passe actuel est incorrect." },
  FOYERMANQUANT: { status: 409, message: "Décris d'abord ton foyer." },
  CONSENTEMENTREQUIS: {
    status: 403,
    message: "Ton accord est nécessaire pour enregistrer des allergies ou des régimes.",
  },
  LECTURESEULE: {
    status: 403,
    message:
      "Tu peux seulement voir ce foyer. Demande le droit de modifier à la personne qui l'a créé.",
  },
  CODEINVALIDE: {
    status: 400,
    message: "Ce code ne fonctionne pas. Vérifie-le ou demande un nouveau code.",
  },
  DEJADANSUNFOYER: { status: 409, message: "Ton compte fait déjà partie d'un foyer." },
  TROPDINVITATIONS: {
    status: 409,
    message: "Tu as déjà 5 codes en attente. Annules-en un pour en créer un nouveau.",
  },
  BUDGETINSUFFISANT: {
    status: 409,
    message: "Le budget de la semaine ne suffit pas pour un menu complet. Augmente-le ou réessaie.",
  },
  RECETTESINSUFFISANTES: {
    status: 409,
    message: "Il n'y a pas assez de recettes adaptées à ton foyer pour remplir la semaine.",
  },
  MENUINCOMPATIBLE: {
    status: 409,
    message: "Ce menu ne convient plus aux allergies ou régimes du foyer. Génère un nouveau menu.",
  },
  TROPDEREQUETES: { status: 429, message: "Trop de tentatives. Réessaie dans quelques minutes." },
  ERREURSERVEUR: { status: 500, message: "Un problème est survenu. Réessaie plus tard." },
} as const;

export type CodeErreur = keyof typeof ERREURS;

export type CorpsErreur = {
  error: { code: CodeErreur; message: string; champs?: Record<string, string> };
};

export class ErreurApi extends Error {
  readonly code: CodeErreur;
  readonly status: number;
  readonly champs?: Record<string, string>;

  constructor(code: CodeErreur, message?: string, champs?: Record<string, string>) {
    super(message ?? ERREURS[code].message);
    this.name = "ErreurApi";
    this.code = code;
    this.status = ERREURS[code].status;
    this.champs = champs;
  }
}

/** Réponse JSON d'erreur au format commun. `champs` précise les erreurs de formulaire. */
export function reponseErreur(
  code: CodeErreur,
  message?: string,
  champs?: Record<string, string>,
): NextResponse<CorpsErreur> {
  const corps: CorpsErreur = { error: { code, message: message ?? ERREURS[code].message } };
  if (champs && Object.keys(champs).length > 0) corps.error.champs = champs;
  return NextResponse.json(corps, { status: ERREURS[code].status });
}

/**
 * Transforme n'importe quelle erreur levée dans une route en réponse propre.
 * Une erreur inattendue est journalisée côté serveur (sans la renvoyer) et devient une 500.
 */
export function gererErreur(erreur: unknown): NextResponse<CorpsErreur> {
  if (erreur instanceof ErreurApi) return reponseErreur(erreur.code, erreur.message, erreur.champs);
  console.error("Erreur inattendue dans une route API", erreur instanceof Error ? erreur.name : "");
  return reponseErreur("ERREURSERVEUR");
}
