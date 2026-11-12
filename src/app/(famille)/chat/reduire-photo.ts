import { PHOTOCOTEMAX } from "@/lib/agent/photo";

// Sur le téléphone, avant l'envoi : la photo est redessinée en JPEG de 1024 px au plus.
// Redessiner efface ses informations cachées (position GPS, appareil) : seule l'image part (règle 7).

export type PhotoReduite = { mediaType: "image/jpeg"; data: string; apercu: string };

const QUALITE = 0.8;

function chargerImage(fichier: File): Promise<HTMLImageElement> {
  return new Promise((resoudre, rejeter) => {
    const url = URL.createObjectURL(fichier);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resoudre(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      rejeter(new Error("illisible"));
    };
    image.src = url;
  });
}

export async function reduirePhoto(fichier: File): Promise<PhotoReduite> {
  if (!fichier.type.startsWith("image/")) throw new Error("pas une image");
  const image = await chargerImage(fichier);
  const echelle = Math.min(1, PHOTOCOTEMAX / Math.max(image.naturalWidth, image.naturalHeight));
  const largeur = Math.max(1, Math.round(image.naturalWidth * echelle));
  const hauteur = Math.max(1, Math.round(image.naturalHeight * echelle));

  const toile = document.createElement("canvas");
  toile.width = largeur;
  toile.height = hauteur;
  const dessin = toile.getContext("2d");
  if (!dessin) throw new Error("illisible");
  dessin.drawImage(image, 0, 0, largeur, hauteur);

  const apercu = toile.toDataURL("image/jpeg", QUALITE);
  return { mediaType: "image/jpeg", data: apercu.slice(apercu.indexOf(",") + 1), apercu };
}
