import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// Photo jointe à un message du chat. Le téléphone la réduit et la réenregistre avant l'envoi :
// ses informations cachées (dont la position GPS) disparaissent (règle 7). Elle n'est montrée
// qu'une fois à Claude, pour ce message, et n'est jamais enregistrée.

export const TYPESPHOTO = ["image/jpeg", "image/png", "image/webp"] as const;

/** Poids maximum de la photo réduite (une photo de 1024 px pèse bien moins). */
export const PHOTOOCTETSMAX = 1_500_000;

/** Côté le plus long de la photo réduite sur le téléphone, en pixels. */
export const PHOTOCOTEMAX = 1024;

export const PHOTOINDISPONIBLE =
  "La photo n'est pas disponible pour le moment. Décris-moi ce que tu as, je t'aide pareil.";

export const PHOTOILLISIBLE = "Cette photo n'a pas pu être lue. Essaie avec une autre.";

export const photoSchema = z.strictObject({
  mediaType: z.enum(TYPESPHOTO),
  // Base64 sans en-tête « data: » ; 4 caractères pour 3 octets
  data: z
    .string()
    .min(100)
    .max(Math.ceil((PHOTOOCTETSMAX * 4) / 3))
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

export type PhotoChat = z.infer<typeof photoSchema>;

/**
 * Les premiers octets disent ce qu'est vraiment le fichier : un texte renommé en .jpg
 * ou un PNG annoncé comme JPEG est refusé avant d'être envoyé à Claude.
 */
export function photoLisible(photo: PhotoChat): boolean {
  const octets = Buffer.from(photo.data.slice(0, 16), "base64");
  const debut = (...attendus: number[]) => attendus.every((o, i) => octets[i] === o);
  switch (photo.mediaType) {
    case "image/jpeg":
      return debut(0xff, 0xd8, 0xff);
    case "image/png":
      return debut(0x89, 0x50, 0x4e, 0x47);
    case "image/webp":
      return debut(0x52, 0x49, 0x46, 0x46) && octets.subarray(8, 12).toString("ascii") === "WEBP";
  }
}

/** Ce qui reste de la photo dans l'historique : une mention, jamais l'image. */
export function texteAvecPhoto(message: string): string {
  const texte = message.trim();
  return texte ? `📷 Photo envoyée · ${texte}` : "📷 Photo envoyée";
}

/** La photo rejoint le dernier message de la famille, juste avant son texte. */
export function ajouterPhoto(
  messages: Anthropic.Messages.MessageParam[],
  photo: PhotoChat,
): Anthropic.Messages.MessageParam[] {
  const dernier = messages.length - 1;
  if (dernier < 0 || messages[dernier].role !== "user") return messages;
  const texte = messages[dernier].content;
  return [
    ...messages.slice(0, dernier),
    {
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: photo.mediaType, data: photo.data },
        },
        ...(typeof texte === "string" ? [{ type: "text" as const, text: texte }] : texte),
      ],
    },
  ];
}
