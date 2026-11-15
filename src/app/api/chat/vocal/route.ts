import { NextResponse } from "next/server";
import { exigerEcriture } from "@/lib/auth/garde";
import { ErreurApi, gererErreur } from "@/lib/erreurs";
import { transcrire, VOCALOCTETSMAX } from "@/lib/agent/vocal";

/** Marge pour l'enveloppe du formulaire autour de l'audio. */
const ENVELOPPEOCTETS = 10_000;

/**
 * POST /api/chat/vocal : transforme un vocal en texte, que la famille relit avant de l'envoyer
 * à Umi. Session, droit d'écrire (lecture seule = 403), vérification de l'audio, puis Whisper.
 * Rien n'est enregistré.
 */
export async function POST(requete: Request) {
  try {
    const session = await exigerEcriture();
    if (!session.householdId) throw new ErreurApi("FOYERMANQUANT");

    // Un envoi trop lourd est refusé avant d'être lu
    const taille = Number(requete.headers.get("content-length") ?? 0);
    if (taille > VOCALOCTETSMAX + ENVELOPPEOCTETS) {
      throw new ErreurApi("DONNEESINVALIDES", "Ce vocal est trop long : une minute au plus.");
    }

    let audio: FormDataEntryValue | null;
    try {
      audio = (await requete.formData()).get("audio");
    } catch {
      throw new ErreurApi("DONNEESINVALIDES");
    }
    if (!(audio instanceof Blob)) throw new ErreurApi("DONNEESINVALIDES");

    return NextResponse.json({ texte: await transcrire(audio) });
  } catch (erreur) {
    return gererErreur(erreur);
  }
}
