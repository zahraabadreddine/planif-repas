import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ingredientsDepart,
  recettesDepart,
  unitesGeneriques,
  type IngredientDepart,
} from "../../prisma/donnees-depart";
import {
  compteAdmin,
  compteAminata,
  comptesTest,
  magasinsDepart,
  quartiersDepart,
  type CompteDepart,
} from "../../prisma/donnees-foyers";
import { datesDuStock, lireMotDePasse } from "../../prisma/foyers";

const parNom = new Map(ingredientsDepart.map((ingredient) => [ingredient.name, ingredient]));
const generiques = new Set(unitesGeneriques.map((unite) => unite.label));

function uniteConnue(ingredient: IngredientDepart, label: string) {
  return generiques.has(label) || ingredient.units.some((unite) => unite.label === label);
}

function allergenesDe(titre: string) {
  const recette = recettesDepart.find((r) => r.title === titre)!;
  return new Set(recette.ingredients.flatMap((ligne) => parNom.get(ligne.name)!.allergens));
}

describe("données de départ du catalogue", () => {
  it("contient une vingtaine de recettes aux titres uniques", () => {
    const titres = recettesDepart.map((r) => r.title);
    expect(titres.length).toBeGreaterThanOrEqual(20);
    expect(new Set(titres).size).toBe(titres.length);
  });

  it("n'a pas deux ingrédients du même nom", () => {
    expect(parNom.size).toBe(ingredientsDepart.length);
  });

  it("n'utilise que des ingrédients et des unités qui existent", () => {
    for (const recette of recettesDepart) {
      for (const ligne of recette.ingredients) {
        const ingredient = parNom.get(ligne.name);
        expect(ingredient, `${recette.title} : ${ligne.name}`).toBeDefined();
        expect(uniteConnue(ingredient!, ligne.unit), `${recette.title} : ${ligne.unit}`).toBe(true);
        expect(ligne.quantity).toBeGreaterThan(0);
      }
    }
  });

  it("donne à chaque ingrédient une unité par défaut et au moins un prix entier en FCFA", () => {
    for (const ingredient of ingredientsDepart) {
      expect(uniteConnue(ingredient, ingredient.defaultUnit), ingredient.name).toBe(true);
      expect(ingredient.prices.length, ingredient.name).toBeGreaterThan(0);
      for (const prix of ingredient.prices) {
        expect(uniteConnue(ingredient, prix.unit), `${ingredient.name} : ${prix.unit}`).toBe(true);
        expect(Number.isInteger(prix.priceFcfa)).toBe(true);
        expect(prix.priceFcfa).toBeGreaterThan(0);
      }
    }
  });

  it("décrit chaque recette avec des étapes, un créneau et une difficulté de 1 à 3", () => {
    for (const recette of recettesDepart) {
      expect(recette.steps.length, recette.title).toBeGreaterThan(0);
      expect(recette.mealTypes.length, recette.title).toBeGreaterThan(0);
      expect(recette.servings).toBeGreaterThan(0);
      expect([1, 2, 3]).toContain(recette.difficulty);
      expect(recette.reference.length, recette.title).toBeGreaterThan(0);
    }
  });

  it("signale l'arachide dans la sauce arachide, pour le filtre des allergies", () => {
    expect(allergenesDe("Sauce arachide au poulet").has("arachide")).toBe(true);
  });

  it("n'ajoute pas d'arachide dans une recette qui n'en contient pas", () => {
    expect(allergenesDe("Garba").has("arachide")).toBe(false);
  });

  it("marque les recettes au four, pour le filtre d'équipement", () => {
    const auFour = recettesDepart.filter((r) => r.tags.includes("four")).map((r) => r.title);
    expect(auFour).toContain("Poulet rôti et pommes de terre");
  });
});

describe("validation des recettes", () => {
  it("ne valide aucune recette encore à relire par une cuisinière d'origine", () => {
    const aRelire = recettesDepart.filter((r) => r.reference.includes("à valider"));
    expect(aRelire).toHaveLength(17);
    for (const recette of aRelire) {
      expect(recette.validated, recette.title).toBe(false);
    }
  });

  it("garde des recettes validées pour chaque créneau de repas", () => {
    const validees = recettesDepart.filter((r) => r.validated);
    for (const creneau of ["breakfast", "lunch", "dinner"] as const) {
      expect(
        validees.some((r) => r.mealTypes.includes(creneau)),
        creneau,
      ).toBe(true);
    }
  });
});

const tousLesComptes: CompteDepart[] = [compteAdmin, ...comptesTest, compteAminata];

const aAllergieStricte = (compte: CompteDepart, valeur: string) =>
  compte.foyer!.members.some((membre) =>
    membre.restrictions.some(
      (r) => r.type === "allergy" && r.value === valeur && r.severity === "strict",
    ),
  );

describe("comptes et foyers de départ", () => {
  it("n'utilise que des emails fictifs et aucun mot de passe écrit dans le code", () => {
    for (const compte of tousLesComptes) {
      expect(compte.email.endsWith("@umami.test"), compte.email).toBe(true);
      expect(compte.motDePasse).toMatch(/^SEED[A-Z]+PASSWORD$/);
      expect(Object.keys(compte)).not.toContain("passwordHash");
    }
    expect(new Set(tousLesComptes.map((c) => c.email)).size).toBe(tousLesComptes.length);
  });

  it("prévoit un seul compte admin, sans foyer", () => {
    expect(tousLesComptes.filter((c) => c.role === "admin")).toEqual([compteAdmin]);
    expect(compteAdmin.foyer).toBeNull();
  });

  it("a un foyer de test avec une allergie stricte à l'arachide", () => {
    expect(comptesTest.some((compte) => aAllergieStricte(compte, "arachide"))).toBe(true);
  });

  it("demande le consentement santé dès qu'un foyer déclare une allergie", () => {
    for (const compte of tousLesComptes.filter((c) => c.foyer)) {
      const restrictions = compte.foyer!.members.flatMap((m) => m.restrictions);
      if (restrictions.length > 0) expect(compte.consentHealth, compte.email).toBe(true);
    }
  });

  it("désigne les membres par un libellé, jamais par un nom", () => {
    for (const compte of tousLesComptes.filter((c) => c.foyer)) {
      for (const membre of compte.foyer!.members) {
        expect(membre.label).toMatch(/^(Adulte|Enfant|Ado|Bébé|Senior) \d+$/);
      }
    }
  });

  it("ne met en stock que des ingrédients et des unités du catalogue", () => {
    for (const compte of tousLesComptes.filter((c) => c.foyer)) {
      for (const ligne of compte.foyer!.stock) {
        const ingredient = parNom.get(ligne.ingredient);
        expect(ingredient, ligne.ingredient).toBeDefined();
        expect(uniteConnue(ingredient!, ligne.unit), ligne.unit).toBe(true);
      }
    }
  });
});

describe("quartiers et magasins de départ", () => {
  it("n'a pas deux quartiers identiques", () => {
    const cles = quartiersDepart.map((q) => `${q.commune}/${q.name}`);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("rattache chaque magasin à un quartier connu, sans doublon", () => {
    for (const magasin of magasinsDepart) {
      const connu = quartiersDepart.some(
        (q) => q.commune === magasin.quartier.commune && q.name === magasin.quartier.name,
      );
      expect(connu, magasin.name).toBe(true);
    }
    const cles = magasinsDepart.map((m) => `${m.quartier.commune}/${m.name}`);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("couvre les trois types de lieux d'achat", () => {
    const types = new Set(magasinsDepart.map((m) => m.type));
    expect(types).toEqual(new Set(["market", "supermarket", "shop"]));
  });

  it("place quartiers et magasins dans la région d'Abidjan", () => {
    for (const lieu of [...quartiersDepart, ...magasinsDepart]) {
      expect(lieu.latitude, lieu.name).toBeGreaterThan(5.2);
      expect(lieu.latitude, lieu.name).toBeLessThan(5.6);
      expect(lieu.longitude, lieu.name).toBeGreaterThan(-4.3);
      expect(lieu.longitude, lieu.name).toBeLessThan(-3.8);
    }
  });
});

describe("foyer de démonstration d'Aminata", () => {
  const foyer = compteAminata.foyer!;

  it("correspond au scénario de référence", () => {
    expect(foyer.members).toHaveLength(4);
    expect(foyer.weeklyBudgetFcfa).toBe(25000);
    expect(foyer.quartier).toEqual({ commune: "Yopougon", name: "Yopougon" });
    expect(quartiersDepart.some((q) => q.commune === "Yopougon")).toBe(true);
  });

  it("a un enfant allergique à l'arachide (allergie stricte)", () => {
    const enfants = foyer.members.filter((m) => m.ageGroup === "child");
    expect(enfants.some((m) => m.restrictions.some((r) => r.value === "arachide"))).toBe(true);
    expect(aAllergieStricte(compteAminata, "arachide")).toBe(true);
  });

  it("a des aubergines à consommer dans moins de 2 jours, pas encore périmées", () => {
    const maintenant = new Date("2026-10-14T08:00:00Z");
    const aubergines = foyer.stock.find((ligne) => ligne.ingredient === "Aubergine")!;
    const { expiresAt } = datesDuStock(aubergines, maintenant);
    const reste = expiresAt!.getTime() - maintenant.getTime();
    expect(reste).toBeGreaterThan(0);
    expect(reste).toBeLessThan(2 * 24 * 60 * 60 * 1000);
  });
});

describe("mots de passe des comptes de départ", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("renvoie null quand la variable est absente du .env", () => {
    vi.stubEnv("SEEDDEMOPASSWORD", "");
    expect(lireMotDePasse("SEEDDEMOPASSWORD")).toBeNull();
  });

  it("refuse un mot de passe trop court, comme à l'inscription", () => {
    vi.stubEnv("SEEDDEMOPASSWORD", "court");
    expect(() => lireMotDePasse("SEEDDEMOPASSWORD")).toThrow();
  });
});

describe("allergènes du catalogue", () => {
  it("n'utilise que les 14 allergènes proposés au parent, sinon le filtre ne les verrait pas", async () => {
    const { ALLERGENES } = await import("@/lib/validation/membre");
    const connus = new Set<string>(ALLERGENES.map((a) => a.valeur));
    for (const ingredient of ingredientsDepart) {
      for (const allergene of ingredient.allergens) {
        expect(connus.has(allergene), `${ingredient.name} : ${allergene}`).toBe(true);
      }
    }
  });
});

describe("prix de départ : relevés réels et estimations", () => {
  const tousLesPrix = async () => {
    const { relevesDepart } = await import("../../prisma/donnees-depart");
    return { relevesDepart };
  };

  it("donne à chaque prix une source, une date réelle et une référence", async () => {
    const { relevesDepart } = await tousLesPrix();
    const prix = [
      ...ingredientsDepart.flatMap((i) => i.prices),
      ...Object.values(relevesDepart).flat(),
    ];
    for (const p of prix) {
      expect(["team", "estimate"]).toContain(p.source);
      expect(p.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(p.observedAt <= "2026-10-18").toBe(true);
      expect(p.reference.length).toBeGreaterThan(10);
    }
  });

  it("ne garde dans les prix des ingrédients que des estimations, signalées comme telles", () => {
    for (const ingredient of ingredientsDepart) {
      for (const p of ingredient.prices) expect(p.source, ingredient.name).toBe("estimate");
    }
  });

  it("cite une source publiée pour chaque relevé réel, au kilo, sur un ingrédient du catalogue", async () => {
    const { relevesDepart } = await tousLesPrix();
    for (const [nom, releves] of Object.entries(relevesDepart)) {
      expect(parNom.has(nom), nom).toBe(true);
      for (const r of releves) {
        expect(r.source).toBe("team");
        expect(r.unit).toBe("kg");
        expect(r.reference).toMatch(/OCPV|Sikafinance/);
        expect(Number.isInteger(r.priceFcfa) && r.priceFcfa > 0).toBe(true);
      }
    }
  });

  it("ne dépasse pas le prix maximum officiel du sucre (875 FCFA le kg)", () => {
    for (const p of parNom.get("Sucre en poudre")!.prices) {
      expect(p.priceFcfa).toBeLessThanOrEqual(875);
    }
  });
});
