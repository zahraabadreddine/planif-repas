import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

// Plats imaginés par Umi quand le catalogue n'a pas ce qu'il faut (fête, cuisine d'ailleurs).
// L'IA propose, le code vérifie (règles 1 et 2) ; ni quantité ni prix inventés (règle 3).

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/agent/tools", () => ({
  OUTILS: new Map([
    [
      "searchRecipes",
      {
        nom: "searchRecipes",
        description: "test",
        schema: z.object({}),
        executer: async () => ({ total: 0 }),
      },
    ],
  ]),
  outilsAnthropicSchema: () => [],
  definitionsOutils: () => [],
}));

import { ingredientsPermis, verifierPlat } from "@/lib/agent/idees-plats";
import type { AlimentAutorise } from "@/lib/agent/idees-frigo";
import { RECHERCHESMAX, executerOutil } from "@/lib/agent/orchestrateur";
import { construireTableSurnoms } from "@/lib/agent/context";
import type { IngredientAFiltrer, RestrictionAFiltrer } from "@/lib/planificateur/filtres";
import type { SessionVerifiee } from "@/lib/auth/garde";

const CATALOGUE: IngredientAFiltrer[] = [
  { name: "Pois chiches", category: "légumineuse", allergens: [] },
  { name: "Aubergine", category: "légume", allergens: [] },
  { name: "Citron", category: "fruit", allergens: [] },
  { name: "Ail", category: "légume", allergens: [] },
  { name: "Tahini", category: "épicerie", allergens: ["sesame"] },
  { name: "Pâte d'arachide", category: "épicerie", allergens: ["arachide"] },
  { name: "Agneau", category: "viande", allergens: [] },
];

// Un enfant allergique au sésame
const RESTRICTIONS: RestrictionAFiltrer[] = [
  { membre: "Enfant 1", type: "allergy", value: "sesame" },
];

const STOCK: AlimentAutorise[] = [
  {
    ingredientId: "i1",
    nom: "Ail",
    quantites: ["1 tête"],
    grammes: 50,
    principal: true,
    aUtiliserVite: false,
  },
];

const plat = (ingredients: string[], etapes: string[] = [], titre = "Moutabal") => ({
  titre,
  categorie: "entrée" as const,
  ingredients,
  etapes,
  personnes: 20,
});

describe("ingrédients que l'IA peut utiliser pour imaginer un plat", () => {
  it("retire par le code ce qu'un membre ne doit pas manger, avant que l'IA le voie", () => {
    const permis = ingredientsPermis(CATALOGUE, RESTRICTIONS);
    expect(permis).toContain("Pois chiches");
    expect(permis).not.toContain("Tahini");
  });
});

describe("vérification d'un plat imaginé", () => {
  it("accepte un plat du catalogue, sépare « déjà chez toi » et « à acheter », sans quantité inventée", () => {
    const resultat = verifierPlat(
      plat(
        ["Aubergine", "ail", "Citrons"],
        ["Griller l'aubergine.", "Écraser avec l'ail et le citron."],
      ),
      CATALOGUE,
      STOCK,
      RESTRICTIONS,
    );
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.idee.ingredients).toEqual([{ nom: "Ail", quantite: "1 tête" }]);
    expect(resultat.idee.aAcheter).toEqual(["Aubergine", "Citron"]);
    expect(resultat.idee.categorie).toBe("entrée");
    expect(resultat.idee.personnes).toBe(20);
  });

  it("refuse un ingrédient interdit à un membre", () => {
    const resultat = verifierPlat(plat(["Pois chiches", "Tahini"]), CATALOGUE, STOCK, RESTRICTIONS);
    expect(resultat.ok).toBe(false);
  });

  it("refuse un aliment interdit cité seulement dans les étapes", () => {
    const resultat = verifierPlat(
      plat(["Pois chiches"], ["Mixer avec une cuillère de tahini."], "Houmous"),
      CATALOGUE,
      STOCK,
      RESTRICTIONS,
    );
    expect(resultat.ok).toBe(false);
  });

  it("refuse un allergène nommé autrement (« sésame » pour le tahini)", () => {
    const resultat = verifierPlat(
      plat(["Pois chiches"], ["Parsemer de graines de sésame."], "Houmous"),
      CATALOGUE,
      STOCK,
      RESTRICTIONS,
    );
    expect(resultat.ok).toBe(false);
  });

  it("refuse un ingrédient absent du catalogue : ses allergènes ne seraient pas vérifiés", () => {
    const resultat = verifierPlat(plat(["Aubergine", "Grenade"]), CATALOGUE, STOCK, RESTRICTIONS);
    expect(resultat).toMatchObject({ ok: false });
    if (!resultat.ok) expect(resultat.raison).toContain("Grenade");
  });

  it("refuse le four si le foyer n'en a pas, l'accepte sinon", () => {
    const auFour = plat(["Agneau"], ["Rôtir l'agneau au four 2 h."], "Agneau rôti");
    expect(verifierPlat(auFour, CATALOGUE, STOCK, RESTRICTIONS, []).ok).toBe(false);
    expect(verifierPlat(auFour, CATALOGUE, STOCK, RESTRICTIONS, ["four"]).ok).toBe(true);
  });
});

describe("garde-fou : Umi ne tourne pas en rond", () => {
  const SESSION: SessionVerifiee = {
    userId: "u1",
    role: "user",
    householdId: "h1",
    acces: "proprietaire",
  };
  const table = construireTableSurnoms([]);
  const rechercher = (compteur: Map<string, number>) =>
    executerOutil(SESSION, { nom: "searchRecipes", input: {} }, table, "c1", undefined, compteur);

  it("au-delà des recherches permises pour un message, il est orienté vers une idée de plat", async () => {
    const compteur = new Map<string, number>();
    for (let i = 0; i < RECHERCHESMAX; i++) expect((await rechercher(compteur)).erreur).toBe(false);
    const refus = await rechercher(compteur);
    expect(refus.erreur).toBe(true);
    expect(refus.contenu).toContain("proposerIdeePlat");
  });

  it("un nouveau message repart avec un compteur neuf", async () => {
    const premier = new Map<string, number>();
    for (let i = 0; i <= RECHERCHESMAX; i++) await rechercher(premier);
    expect((await rechercher(new Map())).erreur).toBe(false);
  });
});
