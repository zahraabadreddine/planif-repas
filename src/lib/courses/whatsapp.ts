import type { PlaceType } from "@prisma/client";
import { nombre, pluriel } from "@/lib/catalogue/quantites";
import { fcfa, whatsappLink } from "@/lib/format";
import type { ArticleEnregistre, ListeEnregistree } from "./generation";

const LIEUX: { type: PlaceType; titre: string }[] = [
  { type: "market", titre: "Marché" },
  { type: "supermarket", titre: "Supermarché" },
  { type: "shop", titre: "Boutique" },
];

function quantite(article: ArticleEnregistre): string {
  return `${nombre(article.quantity)} ${pluriel(article.unit, article.quantity)}`;
}

/** Texte de la liste de courses pour WhatsApp : articles par lieu, quantités en unités du marché, total estimé. */
export function texteWhatsApp(liste: ListeEnregistree): string {
  return (
    `Liste de courses · environ ${fcfa(liste.estimatedTotalFcfa)}\n\n` +
    LIEUX.map(({ type, titre }) => {
      const articles = liste.items.filter((a) => a.placeType === type);
      if (articles.length === 0) return null;
      return (
        `${titre.toUpperCase()}\n` +
        articles.map((a) => `• ${a.ingredient} : ${quantite(a)}`).join("\n")
      );
    })
      .filter(Boolean)
      .join("\n\n")
  );
}

/** Texte et lien WhatsApp pour le partage d'une liste de courses. */
export function partageWhatsApp(liste: ListeEnregistree): { text: string; link: string } {
  const text = texteWhatsApp(liste);
  return { text, link: whatsappLink(text) };
}
