import { describe, expect, it } from "vitest";
import { ageEnAnnees, dateDuJour, trancheDAge } from "@/lib/foyer/age";

describe("âge d'un membre", () => {
  it("compte les années révolues, anniversaire compris", () => {
    expect(ageEnAnnees("2019-03-12", "2026-03-11")).toBe(6);
    expect(ageEnAnnees("2019-03-12", "2026-03-12")).toBe(7);
    expect(ageEnAnnees("2019-03-12", "2026-10-14")).toBe(7);
  });

  it("donne 0 an à un bébé né cette année", () => {
    expect(ageEnAnnees("2026-09-01", "2026-10-14")).toBe(0);
  });

  it("gère les personnes nées un 29 février", () => {
    expect(ageEnAnnees("2016-02-29", "2026-02-28")).toBe(9);
    expect(ageEnAnnees("2016-02-29", "2026-03-01")).toBe(10);
  });
});

describe("tranche d'âge", () => {
  it("respecte les bornes de chaque tranche", () => {
    expect([0, 2, 3, 11, 12, 17, 18, 64, 65, 90].map(trancheDAge)).toEqual([
      "baby",
      "baby",
      "child",
      "child",
      "teen",
      "teen",
      "adult",
      "adult",
      "senior",
      "senior",
    ]);
  });
});

describe("date du jour", () => {
  it("suit l'heure de la Côte d'Ivoire, quel que soit le serveur", () => {
    // 23 h 30 à Abidjan le 14 octobre, déjà le 15 à Paris
    expect(dateDuJour(new Date("2026-10-14T23:30:00Z"))).toBe("2026-10-14");
  });
});
