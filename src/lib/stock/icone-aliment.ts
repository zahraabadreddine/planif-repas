import type { StockIcon } from "@/lib/types";

// Le dessin d'un aliment du frigo : d'abord d'après son nom, puis sa catégorie, sinon un sachet
// neutre. Jamais une tomate par défaut : un poulet ne doit pas ressembler à un légume.

/** Mots du nom, sans accents. L'ordre compte : « thon en boîte » est une conserve, pas un poisson. */
const PARNOM: [RegExp, StockIcon][] = [
  [/\ben boite\b|\bconcentre\b|\bpelees?\b|\bpate d'arachide\b|\btahine\b|\bharissa\b/, "conserve"],
  [/\bmoulue?s?\b|\ben poudre\b|\bgraines? de (cumin|fenugrec)\b|\bseche\b|\bmelange d/, "sachet"],
  [
    /\bfeuilles?\b|\bpersil\b|\bbasilic\b|\bcoriandre fraiche\b|\bmenthe\b|\bchou\b|\blaitue\b/,
    "feuilles",
  ],
  [/\bepinards?\b|\bpoireaux?\b|\bceleri\b|\boseille\b/, "feuilles"],
  [/\boignon vert\b/, "feuilles"],
  [/\boeufs?\b/, "oeuf"],
  [/\bcrevettes?\b|\bgambas\b|\bcrabes?\b|\blangoustes?\b/, "crevette"],
  [/\bgingembre\b/, "gingembre"],
  [/\bpoulet\b|\bpintade\b|\bdinde\b|\bcanard\b/, "poulet"],
  [
    /\bboeuf\b|\bmouton\b|\bporc\b|\blardons?\b|\bjambon\b|\bviande\b|\bagneau\b|\bchevre\b/,
    "viande",
  ],
  [
    /\bcarpe\b|\bmaquereau\b|\bsardines?\b|\bthon\b|\btilapia\b|\bcrevettes?\b|\bpoisson\b|\bcapitaine\b/,
    "poisson",
  ],
  [/\bplantain\b|\bbanane\b/, "plantain"],
  [/\bpommes? de terre\b|\bignames?\b|\bmanioc\b|\bpatate\b|\bgingembre\b|\btaro\b/, "tubercule"],
  [/\bcarottes?\b|\bnavets?\b|\bbetteraves?\b|\bradis\b/, "carotte"],
  [/\bail\b|\bechalotes?\b/, "ail"],
  [/\boignons?\b/, "oignon"],
  [/\btomates?\b/, "tomate"],
  [/\bpiments?\b/, "piment"],
  [/\baubergines?\b/, "aubergine"],
  [/\bgombos?\b/, "gombo"],
  [/\bpoivrons?\b|\bconcombres?\b|\bcourgettes?\b|\bpotiron\b|\bcitrouille\b/, "poivron"],
  [
    /\bcitrons?\b|\boranges?\b|\bmangues?\b|\bananas\b|\bpapayes?\b|\bcoco\b|\bavocats?\b/,
    "citron",
  ],
  [/\blait\b|\bbeurre\b|\bfromage\b|\bghee\b|\byaourt\b|\bcreme\b/, "lait"],
  [
    /\bharicots?\b|\blentilles?\b|\bpois\b|\barachides?\b|\bgraine de palme\b|\bdal\b|\bniebe\b/,
    "grains",
  ],
  [/\bbaguette\b|\bpain\b/, "pain"],
  [/\bhuiles?\b|\brhum\b|\bvin\b|\bvinaigre\b/, "huile"],
  [
    /\briz\b|\battieke\b|\bsemoule\b|\bboulgour\b|\bfonio\b|\bspaghetti\b|\bpates\b|\bmais\b/,
    "riz",
  ],
];

/** Quand le nom ne dit rien : la catégorie du catalogue. */
const PARCATEGORIE: Record<string, StockIcon> = {
  poisson: "poisson",
  "fruits de mer": "crevette",
  volaille: "poulet",
  viande: "viande",
  porc: "viande",
  œufs: "oeuf",
  légume: "feuilles",
  herbe: "feuilles",
  fruit: "citron",
  féculent: "riz",
  légumineuse: "grains",
  oléagineux: "grains",
  "produit laitier": "lait",
  pain: "pain",
  huile: "huile",
  conserve: "conserve",
  épice: "sachet",
  épicerie: "sachet",
};

function simplifier(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").toLowerCase().trim();
}

export function iconeAliment(nom: string, categorie: string): StockIcon {
  const texte = simplifier(nom);
  for (const [motif, icone] of PARNOM) {
    if (motif.test(texte)) return icone;
  }
  return PARCATEGORIE[categorie] ?? "sachet";
}
