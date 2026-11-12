import { describe, expect, it } from "vitest";
import {
  ajouterPhoto,
  photoLisible,
  photoSchema,
  PHOTOOCTETSMAX,
  texteAvecPhoto,
  type PhotoChat,
} from "@/lib/agent/photo";

// Photo du chat : seule une vraie image, assez légère, part chez Claude, une seule fois,
// et l'historique n'en garde qu'une mention (règle 7).

/** Une « image » dont seuls les premiers octets comptent, complétée pour dépasser 100 caractères. */
const base64De = (...octets: number[]) =>
  Buffer.concat([Buffer.from(octets), Buffer.alloc(120)]).toString("base64");

const JPEG = base64De(0xff, 0xd8, 0xff, 0xe0);
const PNG = base64De(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.alloc(4),
  Buffer.from("WEBP"),
  Buffer.alloc(120),
]).toString("base64");

describe("une photo acceptée", () => {
  it("JPEG, PNG et WebP dont les premiers octets correspondent", () => {
    expect(photoLisible({ mediaType: "image/jpeg", data: JPEG })).toBe(true);
    expect(photoLisible({ mediaType: "image/png", data: PNG })).toBe(true);
    expect(photoLisible({ mediaType: "image/webp", data: WEBP })).toBe(true);
  });

  it("refuse un fichier qui ment sur son type", () => {
    expect(photoLisible({ mediaType: "image/jpeg", data: PNG })).toBe(false);
    const texte = Buffer.from("ceci n'est pas une image ".repeat(10)).toString("base64");
    expect(photoLisible({ mediaType: "image/png", data: texte })).toBe(false);
  });

  it("refuse un autre type, une photo trop lourde ou des caractères étrangers", () => {
    expect(photoSchema.safeParse({ mediaType: "image/gif", data: JPEG }).success).toBe(false);
    const lourde = "A".repeat(Math.ceil((PHOTOOCTETSMAX * 4) / 3) + 4);
    expect(photoSchema.safeParse({ mediaType: "image/jpeg", data: lourde }).success).toBe(false);
    expect(
      photoSchema.safeParse({ mediaType: "image/jpeg", data: `${JPEG}<script>` }).success,
    ).toBe(false);
    expect(photoSchema.safeParse({ mediaType: "image/jpeg", data: JPEG }).success).toBe(true);
  });

  it("refuse tout champ en plus (un nom de fichier, une position…)", () => {
    const avecGps = { mediaType: "image/jpeg", data: JPEG, gps: "5.34,-4.02" };
    expect(photoSchema.safeParse(avecGps).success).toBe(false);
  });
});

describe("la photo chez Claude", () => {
  const photo: PhotoChat = { mediaType: "image/jpeg", data: JPEG };

  it("rejoint le dernier message de la famille, avant son texte", () => {
    const messages = ajouterPhoto(
      [
        { role: "user", content: "Bonjour" },
        { role: "assistant", content: "Salut !" },
        { role: "user", content: "📷 Photo envoyée · on fait quoi ?" },
      ],
      photo,
    );
    expect(messages).toHaveLength(3);
    expect(messages[0].content).toBe("Bonjour");
    expect(messages[2].content).toEqual([
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: JPEG } },
      { type: "text", text: "📷 Photo envoyée · on fait quoi ?" },
    ]);
  });

  it("n'est jamais ajoutée à une réponse d'Umi", () => {
    const messages = [{ role: "assistant" as const, content: "Salut !" }];
    expect(ajouterPhoto(messages, photo)).toEqual(messages);
  });

  it("l'historique ne garde qu'une mention, avec ou sans texte", () => {
    expect(texteAvecPhoto("  on fait quoi ? ")).toBe("📷 Photo envoyée · on fait quoi ?");
    expect(texteAvecPhoto("")).toBe("📷 Photo envoyée");
  });
});
