import Anthropic from "@anthropic-ai/sdk";

// Wrapper SDK Anthropic (§10). Le simulateur s'active quand ANTHROPICAPIKEY est vide.

export const MODELECONVERSATION = "claude-sonnet-5-5";
export const MODELESIMPLE = "claude-haiku-4-5-20251001";
export const MODELEMENU = "claude-opus-5-5";

export const MAXTOURSOUTILS = 8;

let clientSingleton: Anthropic | null = null;

export function creerClient(): Anthropic {
  if (clientSingleton) return clientSingleton;
  clientSingleton = new Anthropic({ apiKey: process.env.ANTHROPICAPIKEY });
  return clientSingleton;
}

/** Vrai si l'API Anthropic est configurée (clé non vide). */
export function apiDisponible(): boolean {
  return (process.env.ANTHROPICAPIKEY ?? "").length > 0;
}

// --- Simulateur pour les tests ---

export type ReponseSimulee = {
  texte?: string;
  outils?: { id: string; nom: string; input: Record<string, unknown> }[];
};

let fileSimulation: ReponseSimulee[] = [];
let indexSimulation = 0;

export function simulerReponses(reponses: ReponseSimulee[]): void {
  fileSimulation = reponses;
  indexSimulation = 0;
}

export function resetSimulation(): void {
  fileSimulation = [];
  indexSimulation = 0;
}

export function prochaineReponseSimulee(): ReponseSimulee | null {
  if (indexSimulation >= fileSimulation.length) return null;
  return fileSimulation[indexSimulation++]!;
}

export function estSimule(): boolean {
  return !apiDisponible() || fileSimulation.length > 0;
}
