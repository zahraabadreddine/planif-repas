import type { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";

export type ContexteOutil = {
  conversationId: string;
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
