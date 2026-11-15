import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Vocal du chat : seul un vrai vocal, assez court, part chez Whisper (Groq), en français ;
// le texte revient à la famille, qui le relit avant de l'envoyer. Rien n'est enregistré.

const mocks = vi.hoisted(() => ({ exigerEcriture: vi.fn() }));
vi.mock("@/lib/auth/garde", () => ({ exigerEcriture: mocks.exigerEcriture }));

import {
  LANGUEVOCAL,
  MODELETRANSCRIPTION,
  TRANSCRIPTIONURL,
  VOCALINDISPONIBLE,
  VOCALOCTETSMAX,
  transcrire,
  typeVocal,
  verifierVocal,
} from "@/lib/agent/vocal";
import { ErreurApi } from "@/lib/erreurs";
import { POST } from "@/app/api/chat/vocal/route";

const vocal = (type = "audio/webm;codecs=opus", octets = 2000) =>
  new Blob([new Uint8Array(octets)], { type });

const reponseJson = (corps: unknown, status = 200) =>
  new Response(JSON.stringify(corps), { status, headers: { "Content-Type": "application/json" } });

beforeEach(() => {
  vi.stubEnv("GROQAPIKEY", "cle-de-test");
  mocks.exigerEcriture.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("un vocal accepté", () => {
  it("les formats des téléphones, sans leurs précisions de codec", () => {
    expect(typeVocal("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(typeVocal("audio/mp4")).toBe("audio/mp4");
    expect(typeVocal("AUDIO/OGG; codecs=opus")).toBe("audio/ogg");
    expect(typeVocal("video/mp4")).toBeNull();
    expect(typeVocal("image/jpeg")).toBeNull();
  });

  it("refuse un vide, un trop long ou un autre format", () => {
    expect(() => verifierVocal(vocal("audio/webm", 0))).toThrow("rien entendu");
    expect(() => verifierVocal(vocal("audio/webm", VOCALOCTETSMAX + 1))).toThrow("trop long");
    expect(() => verifierVocal(vocal("text/plain"))).toThrow("format audio");
    expect(verifierVocal(vocal())).toBe("audio/webm");
  });
});

describe("la transcription par Whisper", () => {
  it("envoie l'audio en français au bon modèle et rend le texte", async () => {
    const fetchFn = vi.fn().mockResolvedValue(reponseJson({ text: "  Je rentre à 20 h.  " }));
    const texte = await transcrire(vocal(), fetchFn);

    expect(texte).toBe("Je rentre à 20 h.");
    const [url, options] = fetchFn.mock.calls[0];
    expect(url).toBe(TRANSCRIPTIONURL);
    expect(options.headers.Authorization).toBe("Bearer cle-de-test");
    const formulaire = options.body as FormData;
    expect(formulaire.get("model")).toBe(MODELETRANSCRIPTION);
    expect(formulaire.get("language")).toBe(LANGUEVOCAL);
    expect(LANGUEVOCAL).toBe("fr");
    expect((formulaire.get("file") as File).name).toBe("vocal.webm");
  });

  it("sans clé Groq : message honnête, aucun appel", async () => {
    vi.stubEnv("GROQAPIKEY", "");
    const fetchFn = vi.fn();
    await expect(transcrire(vocal(), fetchFn)).rejects.toThrow(VOCALINDISPONIBLE);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("limite atteinte, panne ou silence : un message clair, jamais le détail technique", async () => {
    await expect(
      transcrire(vocal(), vi.fn().mockResolvedValue(reponseJson({}, 429))),
    ).rejects.toThrow("limite");
    await expect(
      transcrire(vocal(), vi.fn().mockResolvedValue(reponseJson({ error: "clé invalide" }, 401))),
    ).rejects.toThrow(VOCALINDISPONIBLE);
    await expect(
      transcrire(vocal(), vi.fn().mockRejectedValue(new Error("réseau"))),
    ).rejects.toThrow(VOCALINDISPONIBLE);
    await expect(
      transcrire(vocal(), vi.fn().mockResolvedValue(reponseJson({ text: "   " }))),
    ).rejects.toThrow("rien entendu");
  });
});

describe("POST /api/chat/vocal", () => {
  const requete = (audio?: Blob) => {
    const formulaire = new FormData();
    if (audio) formulaire.append("audio", audio, "vocal");
    return new Request("http://localhost/api/chat/vocal", { method: "POST", body: formulaire });
  };

  it("rend le texte du vocal à la famille", async () => {
    mocks.exigerEcriture.mockResolvedValue({ householdId: "h1", acces: "proprietaire" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reponseJson({ text: "On mange quoi ?" })));
    const reponse = await POST(requete(vocal()));
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ texte: "On mange quoi ?" });
  });

  it("en lecture seule : 403, Groq n'est pas appelé", async () => {
    mocks.exigerEcriture.mockRejectedValue(new ErreurApi("LECTURESEULE"));
    const fetchFn = vi.fn();
    vi.stubGlobal("fetch", fetchFn);
    const reponse = await POST(requete(vocal()));
    expect(reponse.status).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("sans audio : 400", async () => {
    mocks.exigerEcriture.mockResolvedValue({ householdId: "h1", acces: "proprietaire" });
    const reponse = await POST(requete());
    expect(reponse.status).toBe(400);
  });
});
