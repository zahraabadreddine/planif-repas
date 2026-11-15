import { ErreurApi } from "@/lib/erreurs";

// Message vocal du chat : le serveur fait écrire l'audio par Whisper (Groq), la famille relit
// le texte avant de l'envoyer à Umi. L'audio n'est jamais enregistré, ni en base ni sur le disque.

export const TRANSCRIPTIONURL = "https://api.groq.com/openai/v1/audio/transcriptions";
/** Le plus précis de Groq : la version « turbo », plus rapide, se trompait trop sur les accents. */
export const MODELETRANSCRIPTION = "whisper-large-v3";

/** Français seulement pour l'instant : l'arabe et l'anglais viendront en changeant cette langue. */
export const LANGUEVOCAL = "fr";

/** Une minute de voix pèse bien moins (environ 500 Ko en webm, 1 Mo en mp4). */
export const VOCALOCTETSMAX = 3_000_000;

/** Formats enregistrés par les téléphones : webm (Chrome, Android), mp4 (iPhone), ogg (Firefox). */
const EXTENSIONS: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
};

/**
 * Whisper suit mieux une phrase naturelle qu'une liste : écrite comme ce que dirait la famille,
 * avec la ponctuation attendue et les plats d'ici qu'il connaît mal.
 */
const VOCABULAIRE =
  "Bonjour Umi. Ce soir, je fais de l'attiéké avec du poisson, ou un garba ? Il me reste des aubergines, du gombo, de l'igname et de la banane plantain. Demain midi, foutou sauce graine, alloco ou kedjenou. Mon budget est de 25 000 FCFA.";

export const VOCALINDISPONIBLE =
  "Le vocal n'est pas disponible pour le moment. Écris ton message, je t'aide pareil.";

/** « audio/webm;codecs=opus » → « audio/webm » ; null si le format n'est pas accepté. */
export function typeVocal(type: string): string | null {
  const base = type.split(";")[0].trim().toLowerCase();
  return base in EXTENSIONS ? base : null;
}

/** Refuse ce qui n'est pas un vocal utilisable, avant tout appel à Groq. */
export function verifierVocal(audio: Blob): string {
  const type = typeVocal(audio.type);
  if (!type) throw new ErreurApi("DONNEESINVALIDES", "Ce format audio n'est pas accepté.");
  if (audio.size === 0) throw new ErreurApi("DONNEESINVALIDES", "Je n'ai rien entendu. Réessaie.");
  if (audio.size > VOCALOCTETSMAX) {
    throw new ErreurApi("DONNEESINVALIDES", "Ce vocal est trop long : une minute au plus.");
  }
  return type;
}

/** Le texte dit dans le vocal. Seul le serveur appelle Groq (règle 6). */
export async function transcrire(audio: Blob, fetchFn: typeof fetch = fetch): Promise<string> {
  const type = verifierVocal(audio);
  const cle = process.env.GROQAPIKEY ?? "";
  if (!cle) throw new ErreurApi("ERREURSERVEUR", VOCALINDISPONIBLE);

  const formulaire = new FormData();
  formulaire.append("file", new File([audio], `vocal.${EXTENSIONS[type]}`, { type }));
  formulaire.append("model", MODELETRANSCRIPTION);
  formulaire.append("language", LANGUEVOCAL);
  formulaire.append("response_format", "json");
  formulaire.append("temperature", "0");
  formulaire.append("prompt", VOCABULAIRE);

  let reponse: Response;
  try {
    reponse = await fetchFn(TRANSCRIPTIONURL, {
      method: "POST",
      headers: { Authorization: `Bearer ${cle}` },
      body: formulaire,
    });
  } catch {
    throw new ErreurApi("ERREURSERVEUR", VOCALINDISPONIBLE);
  }

  if (reponse.status === 429) {
    throw new ErreurApi(
      "ERREURSERVEUR",
      "Le vocal a atteint sa limite pour le moment. Écris ton message ou réessaie plus tard.",
    );
  }
  if (!reponse.ok) throw new ErreurApi("ERREURSERVEUR", VOCALINDISPONIBLE);

  const corps = (await reponse.json().catch(() => null)) as { text?: unknown } | null;
  const texte = typeof corps?.text === "string" ? corps.text.trim() : "";
  if (!texte) throw new ErreurApi("DONNEESINVALIDES", "Je n'ai rien entendu. Réessaie.");
  return texte.slice(0, 2000);
}
