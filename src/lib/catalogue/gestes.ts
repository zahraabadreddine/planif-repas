// Le geste d'une étape de recette, pour la petite illustration de la fiche. Choisi par le code
// d'après les mots de l'étape : pas d'IA, le même dessin à chaque fois, aucun dessin si on hésite.

export type Geste =
  | "couper"
  | "eplucher"
  | "laver"
  | "melanger"
  | "mixer"
  | "marmite"
  | "poele"
  | "griller"
  | "four"
  | "verser"
  | "servir";

/** Mots reconnus, écrits sans accents. L'ordre ne compte pas : c'est le premier cité qui gagne. */
const MOTS: [Geste, RegExp][] = [
  ["poele", /\b(revenir|frire|fris|frit|dorer|dore|saute[rs]?|poele)\b/],
  // Poisson braisé, brochettes, poulet braisé : sur le gril ou les braises
  ["griller", /\b(griller|grille|grilles|braises?|barbecue)\b/],
  ["eplucher", /\b(epluche[rs]?|decortique[rs]?|pele[rs]?)\b/],
  [
    "couper",
    /\b(coupe[rs]?|emince[rs]?|decoupe[rs]?|hache[rs]?|divise[rs]?|tranche[rs]?|detaille[rs]?)\b/,
  ],
  ["laver", /\b(lave[rs]?|nettoie[rs]?|rince[rs]?)\b/],
  ["mixer", /\b(mixe[rs]?|ecrase[rs]?|pile[rs]?|broie[rs]?)\b/],
  ["marmite", /\b(cuire|cuis|cuit|bouillir|bout|mijote[rs]?|chauffe[rs]?|ebullition|marmite)\b/],
  ["melanger", /\b(melange[rs]?|bats|battre|enrobe[rs]?|remue[rs]?|fouette[rs]?|petris)\b/],
  ["verser", /\b(ajoute[rs]?|verse[rs]?|parseme[rs]?|incorpore[rs]?|arrose[rs]?)\b/],
  ["servir", /\b(sers|servir|dresse[rs]?|garnis)\b/],
];

/** « Épluche » → « epluche » : les recettes s'écrivent avec ou sans accents. */
function simplifier(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Le geste montré pour une étape : le four d'abord (le plus utile à savoir), sinon le premier
 * geste cité dans la phrase. null quand aucun mot n'est reconnu.
 */
export function gesteDeLEtape(texte: string): Geste | null {
  const phrase = simplifier(texte);
  if (/\b(four|enfourne[rs]?)\b/.test(phrase)) return "four";

  let meilleur: { geste: Geste; position: number } | null = null;
  for (const [geste, motif] of MOTS) {
    const position = phrase.search(motif);
    if (position >= 0 && (!meilleur || position < meilleur.position)) {
      meilleur = { geste, position };
    }
  }
  return meilleur?.geste ?? null;
}
