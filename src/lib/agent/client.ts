import Anthropic from "@anthropic-ai/sdk";

// Wrapper SDK Anthropic (§10). Sans clé Claude, Groq est utilisé s'il a une clé ;
// sans aucune clé, le simulateur répond.

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

export type Fournisseur = "claude" | "groq";

/**
 * Fournisseur d'IA utilisé, choisi à un seul endroit (ENF-21) : Claude s'il a une clé (fournisseur
 * prévu par CLAUDE.md), sinon Groq s'il en a une, sinon aucun (mode simulé).
 */
export function fournisseurActif(): Fournisseur | null {
  if (apiDisponible()) return "claude";
  if ((process.env.GROQAPIKEY ?? "").length > 0) return "groq";
  return null;
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
  return fournisseurActif() === null || fileSimulation.length > 0;
}
