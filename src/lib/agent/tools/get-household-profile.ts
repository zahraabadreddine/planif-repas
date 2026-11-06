import { z } from "zod";
import type { SessionVerifiee } from "@/lib/auth/garde";
import { construireContexte } from "@/lib/agent/context";
import type { OutilAgent } from "./types";

const schema = z.object({}).strict();

type Input = z.infer<typeof schema>;

async function executer(session: SessionVerifiee, _input: Input, _contexte: unknown) {
  const { contexte } = await construireContexte(session);
  return { profil: contexte.profil };
}

export const getHouseholdProfile: OutilAgent<typeof schema> = {
  nom: "getHouseholdProfile",
  description:
    "Renvoie le profil anonymisé du foyer : budget, cuisines, équipement, commune, membres (avec allergies et régimes), préférences apprises.",
  schema,
  executer,
};
