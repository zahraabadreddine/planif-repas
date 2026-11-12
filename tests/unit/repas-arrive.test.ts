import { describe, expect, it } from "vitest";
import { quandCuisiner, repasArrive } from "@/lib/planificateur/moment";

// « C'est cuisiné » seulement quand le repas est arrivé : jamais un repas de demain,
// ni le dîner à midi (il retirerait du stock des ingrédients encore dans la cuisine).

// Abidjan est à UTC+0 : jeudi 12 novembre 2026 à l'heure donnée
const jeudi = (heure: string) => new Date(`2026-11-12T${heure}:00Z`);

describe("un repas peut être marqué cuisiné une fois son moment arrivé", () => {
  it("un jour passé : toujours, même le dîner d'hier oublié", () => {
    expect(repasArrive("2026-11-11", "dinner", jeudi("07:00"))).toBe(true);
    expect(repasArrive("2026-11-09", "lunch", jeudi("07:00"))).toBe(true);
  });

  it("le petit déjeuner d'aujourd'hui : dès le matin", () => {
    expect(repasArrive("2026-11-12", "breakfast", jeudi("06:00"))).toBe(true);
  });

  it("le déjeuner d'aujourd'hui : à partir de 12 h", () => {
    expect(repasArrive("2026-11-12", "lunch", jeudi("11:59"))).toBe(false);
    expect(repasArrive("2026-11-12", "lunch", jeudi("12:00"))).toBe(true);
  });

  it("le dîner d'aujourd'hui : à partir de 17 h, pas à midi", () => {
    expect(repasArrive("2026-11-12", "dinner", jeudi("12:30"))).toBe(false);
    expect(repasArrive("2026-11-12", "dinner", jeudi("16:59"))).toBe(false);
    expect(repasArrive("2026-11-12", "dinner", jeudi("17:00"))).toBe(true);
  });

  it("demain ou plus tard : jamais, même le petit déjeuner", () => {
    expect(repasArrive("2026-11-13", "breakfast", jeudi("23:30"))).toBe(false);
    expect(repasArrive("2026-11-15", "dinner", jeudi("20:00"))).toBe(false);
  });
});

describe("la famille lit quand elle pourra le marquer", () => {
  it("aujourd'hui : l'heure", () => {
    expect(quandCuisiner("2026-11-12", "lunch", jeudi("10:00"))).toBe("à partir de 12 h");
    expect(quandCuisiner("2026-11-12", "dinner", jeudi("13:00"))).toBe("à partir de 17 h");
  });

  it("demain, puis le jour de la semaine", () => {
    expect(quandCuisiner("2026-11-13", "dinner", jeudi("13:00"))).toBe("demain soir");
    expect(quandCuisiner("2026-11-14", "lunch", jeudi("13:00"))).toBe("samedi midi");
    expect(quandCuisiner("2026-11-16", "breakfast", jeudi("13:00"))).toBe("lundi matin");
  });
});
