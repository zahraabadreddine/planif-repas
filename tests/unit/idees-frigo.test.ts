import { describe, expect, it } from "vitest";
import {
  GRAMMESPARPERSONNE,
  alimentsAutorises,
  verifierIdee,
  type ArticlePourIdee,
} from "@/lib/agent/idees-frigo";
import type { IngredientAFiltrer, RestrictionAFiltrer } from "@/lib/planificateur/filtres";

// Vider le frigo en conversation : l'IA imagine un plat, le code vérifie tout (règles 1, 2 et 3).

const ID = {
  attieke: "11111111-1111-4111-8111-111111111111",
  oeuf: "22222222-2222-4222-8222-222222222222",
  ail: "33333333-3333-4333-8333-333333333333",
  arachide: "44444444-4444-4444-8444-444444444444",
  poulet: "55555555-5555-4555-8555-555555555555",
};

const article = (
  ingredientId: string,
  name: string,
  quantity: number,
  unitLabel: string,
  extra: Partial<ArticlePourIdee> = {},
): ArticlePourIdee => ({
  ingredientId,
  name,
  category: "féculent",
  allergens: [],
  quantity,
  unitLabel,
  gramsEquivalent: 1000,
  status: "ok",
  ...extra,
});

const STOCK: ArticlePourIdee[] = [
  article(ID.attieke, "Attiéké", 1, "sachet", { status: "useSoon" }),
  article(ID.oeuf, "Œuf", 5, "pièces", { allergens: ["oeuf"] }),
  article(ID.oeuf, "Œuf", 0.5, "plateau", { allergens: ["oeuf"] }),
  article(ID.ail, "Ail", 1, "tête"),
  article(ID.arachide, "Pâte d'arachide", 1, "pot", { allergens: ["arachide"] }),
  article(ID.poulet, "Poulet", 1, "kg", { category: "volaille" }),
];

const CATALOGUE: IngredientAFiltrer[] = [
  { name: "Attiéké", category: "féculent", allergens: [] },
  { name: "Œuf", category: "œuf", allergens: ["oeuf"] },
  { name: "Ail", category: "légume", allergens: [] },
  { name: "Pâte d'arachide", category: "épicerie", allergens: ["arachide"] },
  { name: "Poulet", category: "volaille", allergens: [] },
  { name: "Tomate", category: "légume", allergens: [] },
  { name: "Huile", category: "huile", allergens: [] },
  { name: "Eau", category: "boisson", allergens: [] },
  { name: "Sel", category: "épicerie", allergens: [] },
  { name: "Huile végétale", category: "huile", allergens: [] },
  { name: "Huile d'arachide", category: "huile", allergens: ["arachide"] },
  { name: "Huile de palme", category: "huile", allergens: [] },
];

// Enfant 1 allergique à l'arachide, Adulte 1 végétarien
const RESTRICTIONS: RestrictionAFiltrer[] = [
  { membre: "Enfant 1", type: "allergy", value: "arachide" },
  { membre: "Adulte 1", type: "diet", value: "vegetarien" },
];

const autorises = alimentsAutorises(STOCK, RESTRICTIONS);

const idee = (ingredientIds: string[], etapes: string[], titre = "Attiéké du soir") => ({
  titre,
  ingredientIds,
  etapes,
  personnes: 4,
  minutes: 15,
});

describe("aliments que l'IA peut utiliser", () => {
  it("retire par le code ce qu'un membre ne doit pas manger, avant que l'IA le voie", () => {
    const noms = autorises.map((a) => a.nom);
    expect(noms).toEqual(["Attiéké", "Œuf", "Ail"]);
    expect(noms).not.toContain("Pâte d'arachide");
    expect(noms).not.toContain("Poulet");
  });

  it("donne les quantités du stock, calculées par le code et regroupées", () => {
    const oeuf = autorises.find((a) => a.nom === "Œuf");
    expect(oeuf?.quantites).toEqual(["5 pièces", "0,5 plateau"]);
  });

  it("signale l'aliment à utiliser vite", () => {
    expect(autorises.find((a) => a.nom === "Attiéké")?.aUtiliserVite).toBe(true);
  });

  it("ignore un article vide", () => {
    expect(alimentsAutorises([article(ID.ail, "Ail", 0, "tête")], [])).toEqual([]);
  });
});

describe("vérification d'une idée", () => {
  it("accepte une idée faite seulement avec le stock autorisé", () => {
    const resultat = verifierIdee(
      idee(
        [ID.attieke, ID.oeuf, ID.ail],
        ["Écraser l'ail.", "Brouiller les œufs avec l'ail.", "Servir sur l'attiéké chaud."],
      ),
      autorises,
      CATALOGUE,
      RESTRICTIONS,
    );
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.idee.ingredients).toEqual([
      { nom: "Attiéké", quantite: "1 sachet" },
      { nom: "Œuf", quantite: "5 pièces + 0,5 plateau" },
      { nom: "Ail", quantite: "1 tête" },
    ]);
    expect(resultat.idee.personnes).toBe(4);
  });

  it("refuse un ingrédient interdit, même si l'IA donne son identifiant", () => {
    const resultat = verifierIdee(
      idee([ID.attieke, ID.arachide], ["Mélanger."]),
      autorises,
      CATALOGUE,
      RESTRICTIONS,
    );
    expect(resultat.ok).toBe(false);
  });

  it("refuse une idée dont les étapes citent un aliment interdit", () => {
    const resultat = verifierIdee(
      idee([ID.attieke, ID.oeuf], ["Ajouter un peu de pâte d'arachide.", "Servir."]),
      autorises,
      CATALOGUE,
      RESTRICTIONS,
    );
    expect(resultat).toMatchObject({ ok: false });
    if (!resultat.ok) expect(resultat.raison).toContain("interdit");
  });

  it("refuse un allergène nommé autrement (« cacahuètes »)", () => {
    const resultat = verifierIdee(
      idee([ID.attieke], ["Parsemer de cacahuètes grillées."]),
      autorises,
      CATALOGUE,
      RESTRICTIONS,
    );
    expect(resultat.ok).toBe(false);
  });

  it("refuse un aliment interdit par un régime cité dans le titre", () => {
    const resultat = verifierIdee(
      idee([ID.attieke], ["Servir."], "Attiéké au poulet"),
      autorises,
      CATALOGUE,
      RESTRICTIONS,
    );
    expect(resultat.ok).toBe(false);
  });

  it("refuse un aliment qu'il faudrait acheter", () => {
    const resultat = verifierIdee(
      idee([ID.attieke, ID.oeuf], ["Faire revenir une tomate.", "Ajouter les œufs."]),
      autorises,
      CATALOGUE,
      RESTRICTIONS,
    );
    expect(resultat).toMatchObject({ ok: false });
    if (!resultat.ok) expect(resultat.raison).toContain("pas dans le stock");
  });

  it("demande d'ajouter aux ingrédients un aliment du stock cité dans les étapes", () => {
    const resultat = verifierIdee(
      idee([ID.attieke], ["Brouiller les œufs.", "Servir."]),
      autorises,
      CATALOGUE,
      RESTRICTIONS,
    );
    expect(resultat).toMatchObject({ ok: false });
    if (!resultat.ok) expect(resultat.raison).toContain("ingredientIds");
  });

  it("accepte l'eau, qui ne s'achète pas", () => {
    const resultat = verifierIdee(
      idee([ID.attieke], ["Chauffer un peu d'eau.", "Réchauffer l'attiéké à la vapeur."]),
      autorises,
      CATALOGUE,
      RESTRICTIONS,
    );
    expect(resultat.ok).toBe(true);
  });

  it("refuse un identifiant inconnu", () => {
    const resultat = verifierIdee(
      idee(["66666666-6666-4666-8666-666666666666"], ["Servir."]),
      autorises,
      CATALOGUE,
      RESTRICTIONS,
    );
    expect(resultat.ok).toBe(false);
  });

  it("une autre allergie écrite par le parent (« kiwi ») est aussi refusée", () => {
    const resultat = verifierIdee(
      idee([ID.attieke], ["Décorer avec du kiwi."]),
      autorises,
      CATALOGUE,
      [{ membre: "Enfant 1", type: "allergy", value: "kiwi" }],
    );
    expect(resultat.ok).toBe(false);
  });
});

describe("produits de base du placard (sel, huile)", () => {
  it("sont comptés comme présents et affichés « du placard »", () => {
    const resultat = verifierIdee(
      idee(
        [ID.oeuf],
        ["Faire chauffer un peu d'huile.", "Brouiller les œufs avec une pincée de sel."],
        "Œufs brouillés",
      ),
      autorises,
      CATALOGUE,
      RESTRICTIONS,
    );
    expect(resultat.ok).toBe(true);
    if (resultat.ok) expect(resultat.idee.duPlacard).toEqual(["sel", "huile"]);
  });

  it("sont refusés si la famille a dit qu'elle n'en a pas", () => {
    const resultat = verifierIdee(
      {
        ...idee([ID.oeuf], ["Faire chauffer un peu d'huile.", "Cuire les œufs."], "Œufs brouillés"),
        basesManquantes: ["huile"],
      },
      autorises,
      CATALOGUE,
      RESTRICTIONS,
    );
    expect(resultat).toMatchObject({ ok: false });
    if (!resultat.ok) expect(resultat.raison).toContain("pas de huile");
  });

  it("une huile à l'arachide reste interdite : les allergies passent avant", () => {
    const resultat = verifierIdee(
      idee([ID.oeuf], ["Cuire les œufs dans l'huile d'arachide."], "Œufs brouillés"),
      autorises,
      CATALOGUE,
      RESTRICTIONS,
    );
    expect(resultat.ok).toBe(false);
  });

  it("une autre huile, absente du stock, reste à acheter donc refusée", () => {
    const resultat = verifierIdee(
      idee([ID.oeuf], ["Cuire les œufs dans l'huile de palme."], "Œufs brouillés"),
      autorises,
      CATALOGUE,
      RESTRICTIONS,
    );
    expect(resultat.ok).toBe(false);
  });
});

describe("carte : rien en double", () => {
  it("une huile déjà dans les ingrédients (du stock) n'est pas répétée « du placard »", () => {
    const huile = "99999999-9999-4999-8999-999999999999";
    const avecHuile = alimentsAutorises(
      [...STOCK, article(huile, "Huile végétale", 1, "bouteille", { category: "huile" })],
      RESTRICTIONS,
    );
    const resultat = verifierIdee(
      idee(
        [ID.oeuf, huile],
        ["Chauffer l'huile végétale.", "Cuire les œufs avec du sel."],
        "Œufs au plat",
      ),
      avecHuile,
      CATALOGUE,
      RESTRICTIONS,
    );
    expect(resultat.ok).toBe(true);
    if (resultat.ok) expect(resultat.idee.duPlacard).toEqual(["sel"]);
  });
});

describe("assez à manger pour tout le monde (calculé par le code)", () => {
  const poulet = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const sel = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  // 1 poulet de 1,2 kg et un gros sachet de sel : le sel ne nourrit personne
  const stock = alimentsAutorises(
    [
      article(poulet, "Poulet", 1, "poulet entier", {
        category: "volaille",
        gramsEquivalent: 1200,
      }),
      article(sel, "Sel", 1, "sachet", { category: "épicerie", gramsEquivalent: 500 }),
    ],
    [],
  );
  const pour = (personnes: number) =>
    verifierIdee(
      {
        ...idee([poulet, sel], ["Rôtir le poulet à la poêle avec le sel."], "Poulet poêlé"),
        personnes,
      },
      stock,
      CATALOGUE,
      [],
    );

  it("compte le poids du stock, sans les assaisonnements", () => {
    expect(stock.find((a) => a.nom === "Poulet")).toMatchObject({ grammes: 1200, principal: true });
    expect(stock.find((a) => a.nom === "Sel")).toMatchObject({ principal: false });
  });

  it(`accepte jusqu'à ${GRAMMESPARPERSONNE} g par personne`, () => {
    expect(pour(4).ok).toBe(true);
  });

  it("refuse « pour 20 personnes » avec un seul poulet, et dit pour combien c'est possible", () => {
    const resultat = pour(20);
    expect(resultat).toMatchObject({ ok: false });
    if (!resultat.ok) expect(resultat.raison).toContain("pour 4 personnes au plus");
  });

  it("des épices seules ne font pas un repas", () => {
    const resultat = verifierIdee(
      { ...idee([sel], ["Saler."], "Sel"), personnes: 1 },
      stock,
      CATALOGUE,
      [],
    );
    expect(resultat).toMatchObject({ ok: false });
    if (!resultat.ok) expect(resultat.raison).toContain("ne suffisent pas");
  });
});

describe("équipement du foyer", () => {
  const auFour = idee([ID.oeuf], ["Cuire les œufs au four 10 min."], "Œufs au four");

  it("refuse une idée au four si le foyer n'a pas de four", () => {
    const resultat = verifierIdee(auFour, autorises, CATALOGUE, RESTRICTIONS, []);
    expect(resultat).toMatchObject({ ok: false });
    if (!resultat.ok) expect(resultat.raison).toContain("pas de four");
  });

  it("l'accepte si le foyer a un four", () => {
    expect(verifierIdee(auFour, autorises, CATALOGUE, RESTRICTIONS, ["four"]).ok).toBe(true);
  });

  it("« fourchette » n'est pas un four", () => {
    const resultat = verifierIdee(
      idee([ID.oeuf], ["Battre les œufs à la fourchette."], "Œufs brouillés"),
      autorises,
      CATALOGUE,
      RESTRICTIONS,
      [],
    );
    expect(resultat.ok).toBe(true);
  });
});
