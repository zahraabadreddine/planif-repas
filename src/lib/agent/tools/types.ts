import type { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import type { IdeeFrigo } from "@/lib/agent/idees-frigo";

/** Carte montrée dans le chat sans rien enregistrer (une idée vérifiée par le code). */
export type CarteChat =
  { type: "idee"; idee: IdeeFrigo } | { type: "cuisine"; repas: RepasACuisiner };

/** Un repas du menu que la famille dit avoir cuisiné, montré avec le bouton « C'est cuisiné ». */
export type RepasACuisiner = { id: string; titre: string; date: string; creneau: string };

export type ContexteOutil = {
  conversationId: string;
  // Affiche une carte dans la conversation en cours (absent hors flux)
  afficher?: (carte: CarteChat) => void;
};

export type OutilAgent<TSchema extends z.ZodType = z.ZodType> = {
  nom: string;
  description: string;
  schema: TSchema;
  executer: (
    session: SessionVerifiee,
    input: z.infer<TSchema>,
    contexte: ContexteOutil,
  ) => Promise<Record<string, unknown>>;
};
