/** Un morceau de texte, en gras ou non. */
export type Segment = { texte: string; gras: boolean };

/** Une ligne d'un message de l'assistante : un paragraphe ou un élément de liste. */
export type BlocChat = { type: "paragraphe" | "puce"; segments: Segment[] };

/** Découpe « un **mot** important » en segments ; une étoile seule reste telle quelle. */
export function segmentsGras(ligne: string): Segment[] {
  const morceaux = ligne.split(/\*\*(.+?)\*\*/g);
  return morceaux
    .map((texte, i) => ({ texte, gras: i % 2 === 1 }))
    .filter((s) => s.texte.length > 0);
}

/** Ligne de séparation d'un tableau Markdown : « |---|:---:| ». */
const SEPARATEURTABLEAU = /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/;

/** Ligne de tableau « | a | b | » rendue lisible : « a · b ». */
function ligneTableau(ligne: string): string {
  return ligne
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean)
    .join(" · ");
}

/**
 * Met en forme la réponse de l'assistante pour un téléphone, même si le modèle écrit
 * du Markdown malgré la consigne : titres, listes, gras et tableaux deviennent du texte simple.
 */
export function formaterTexteChat(texte: string): BlocChat[] {
  const blocs: BlocChat[] = [];
  for (const brute of texte.split(/\r?\n/)) {
    let ligne = brute.trim();
    if (!ligne || SEPARATEURTABLEAU.test(ligne)) continue;

    let type: BlocChat["type"] = "paragraphe";
    ligne = ligne.replace(/^#{1,6}\s+/, "");
    if (ligne.startsWith("|")) ligne = ligneTableau(ligne);
    // Une liste numérotée garde ses numéros (étapes d'une recette)
    const puce = ligne.match(/^[-*•]\s+(.*)$/);
    if (puce) {
      type = "puce";
      ligne = puce[1];
    }
    const segments = segmentsGras(ligne);
    if (segments.length > 0) blocs.push({ type, segments });
  }
  return blocs;
}
