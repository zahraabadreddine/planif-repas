import { describe, expect, it } from "vitest";
import { haversine, magasinsProches } from "@/lib/magasins/distance";

describe("haversine", () => {
  it("renvoie 0 pour deux points identiques", () => {
    expect(haversine(5.3, -4.0, 5.3, -4.0)).toBe(0);
  });

  it("calcule la distance Abidjan → Yamoussoukro (~240 km)", () => {
    const d = haversine(5.316, -4.0167, 6.8206, -5.2764);
    expect(d).toBeGreaterThan(200);
    expect(d).toBeLessThan(280);
  });

  it("est symétrique", () => {
    const ab = haversine(5.316, -4.0, 6.82, -5.27);
    const ba = haversine(6.82, -5.27, 5.316, -4.0);
    expect(ab).toBeCloseTo(ba, 10);
  });
});

describe("magasinsProches", () => {
  const magasins = [
    {
      id: "a",
      name: "Loin",
      type: "market" as const,
      address: "loin",
      latitude: 6.0,
      longitude: -4.0,
      openingHours: null,
    },
    {
      id: "b",
      name: "Proche",
      type: "market" as const,
      address: "proche",
      latitude: 5.32,
      longitude: -4.02,
      openingHours: null,
    },
    {
      id: "c",
      name: "Moyen",
      type: "market" as const,
      address: "moyen",
      latitude: 5.5,
      longitude: -4.1,
      openingHours: null,
    },
  ];

  it("renvoie les magasins du plus proche au plus loin", () => {
    const resultat = magasinsProches(magasins, 5.316, -4.0167, 10, new Date());
    expect(resultat[0].name).toBe("Proche");
    expect(resultat[1].name).toBe("Moyen");
    expect(resultat[2].name).toBe("Loin");
  });

  it("limite le nombre de résultats", () => {
    const resultat = magasinsProches(magasins, 5.316, -4.0167, 2, new Date());
    expect(resultat).toHaveLength(2);
  });

  it("exclut les magasins fermés", () => {
    const avecFerme = [
      ...magasins,
      {
        id: "d",
        name: "Fermé",
        type: "market" as const,
        address: "fermé",
        latitude: 5.317,
        longitude: -4.017,
        openingHours: { mardi: "08:00-09:00" },
      },
    ];
    const mardi = new Date("2026-10-27T10:00:00");
    const resultat = magasinsProches(avecFerme, 5.316, -4.0167, 10, mardi);
    expect(resultat.find((m) => m.name === "Fermé")).toBeUndefined();
  });
});
