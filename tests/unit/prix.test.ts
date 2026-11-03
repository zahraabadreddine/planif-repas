import { describe, expect, it } from "vitest";
import { mediane, prixRetenu, type Releve } from "@/lib/courses/prix";

const maintenant = new Date("2026-10-18T12:00:00Z");
const ilYa = (jours: number) => new Date(maintenant.getTime() - jours * 24 * 60 * 60 * 1000);

const releve = (priceFcfa: number, source: Releve["source"], jours = 5, grams = 1000): Releve => ({
  priceFcfa,
  grams,
  source,
  observedAt: ilYa(jours),
});

describe("médiane", () => {
  it("prend la valeur du milieu, ou la moyenne des deux du milieu", () => {
    expect(mediane([700, 500, 650])).toBe(650);
    expect(mediane([500, 650])).toBe(575);
  });
});

describe("prix retenu (CLAUDE.md §11)", () => {
  it("donne la médiane des relevés de l'équipe, au kilo", () => {
    expect(prixRetenu([releve(500, "team"), releve(650, "team")], maintenant)).toMatchObject({
      fcfaParKg: 575,
      nature: "releve",
    });
  });

  it("ramène un relevé au kilo, quelle que soit son unité (un tas de 500 g à 400 F)", () => {
    expect(prixRetenu([releve(400, "team", 5, 500)], maintenant)?.fcfaParKg).toBe(800);
  });

  it("garde la priorité à l'équipe tant qu'il y a moins de 3 relevés d'utilisatrices", () => {
    const releves = [releve(600, "team"), releve(1000, "user"), releve(1100, "user")];
    expect(prixRetenu(releves, maintenant)?.fcfaParKg).toBe(600);
  });

  it("passe aux relevés d'utilisatrices à partir de 3", () => {
    const releves = [
      releve(600, "team"),
      releve(900, "user"),
      releve(1000, "user"),
      releve(1100, "user"),
    ];
    expect(prixRetenu(releves, maintenant)?.fcfaParKg).toBe(1000);
  });

  it("utilise les relevés d'utilisatrices quand l'équipe n'en a aucun", () => {
    expect(prixRetenu([releve(900, "user")], maintenant)?.fcfaParKg).toBe(900);
  });

  it("ignore les relevés de plus de 90 jours", () => {
    const releves = [releve(500, "team", 91), releve(700, "team", 89)];
    expect(prixRetenu(releves, maintenant)?.fcfaParKg).toBe(700);
  });

  it("n'utilise une estimation qu'à défaut de relevé récent, et la signale comme telle", () => {
    expect(prixRetenu([releve(800, "estimate"), releve(600, "team")], maintenant)).toMatchObject({
      fcfaParKg: 600,
      nature: "releve",
    });
    expect(
      prixRetenu([releve(800, "estimate"), releve(600, "team", 120)], maintenant),
    ).toMatchObject({ fcfaParKg: 800, nature: "estimation" });
  });

  it("prend l'estimation la plus récente", () => {
    const releves = [releve(800, "estimate", 30), releve(900, "estimate", 2)];
    expect(prixRetenu(releves, maintenant)?.fcfaParKg).toBe(900);
  });

  it("renvoie null sans relevé ni estimation : prix inconnu", () => {
    expect(prixRetenu([], maintenant)).toBeNull();
    expect(prixRetenu([releve(500, "team", 200)], maintenant)).toBeNull();
  });

  it("donne un prix entier en FCFA", () => {
    expect(prixRetenu([releve(333, "team", 5, 500)], maintenant)?.fcfaParKg).toBe(666);
    expect(Number.isInteger(prixRetenu([releve(1000, "team", 5, 3)], maintenant)!.fcfaParKg)).toBe(
      true,
    );
  });
});
