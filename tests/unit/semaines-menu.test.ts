import { describe, expect, it } from "vitest";
import {
  dateValide,
  decalerSemaine,
  libelleSemaine,
  lundiCourant,
  lundiDe,
  lundiEnToutesLettres,
  menuCourant,
  menuDeLaSemaine,
  type MenuCandidat,
} from "@/lib/planificateur/semaines";

// Calendrier du menu : on parcourt les semaines, et le « menu courant » est celui de la semaine
// en cours, même quand celui de la semaine prochaine est déjà prêt.

const menu = (
  id: string,
  weekStart: string,
  status: MenuCandidat["status"] = "active",
  creeLe = "2026-11-01",
): MenuCandidat => ({ id, weekStart, status, createdAt: new Date(`${creeLe}T10:00:00Z`) });

describe("les semaines vont du lundi au dimanche", () => {
  it("le lundi d'un jour, dimanche compris", () => {
    expect(lundiDe("2026-11-16")).toBe("2026-11-16");
    expect(lundiDe("2026-11-19")).toBe("2026-11-16");
    expect(lundiDe("2026-11-22")).toBe("2026-11-16");
  });

  it("d'une semaine à l'autre, même en changeant de mois ou d'année", () => {
    expect(decalerSemaine("2026-11-16", 1)).toBe("2026-11-23");
    expect(decalerSemaine("2026-11-16", -1)).toBe("2026-11-09");
    expect(decalerSemaine("2026-11-30", 1)).toBe("2026-12-07");
    expect(decalerSemaine("2026-12-28", 1)).toBe("2027-01-04");
  });

  it("la semaine en cours à Abidjan : dimanche soir est encore cette semaine", () => {
    expect(lundiCourant(new Date("2026-11-15T23:30:00Z"))).toBe("2026-11-09");
    expect(lundiCourant(new Date("2026-11-16T00:10:00Z"))).toBe("2026-11-16");
  });

  it("une date de l'adresse doit être une vraie date", () => {
    expect(dateValide("2026-11-16")).toBe(true);
    expect(dateValide("2026-02-31")).toBe(false);
    expect(dateValide("16/11/2026")).toBe(false);
    expect(dateValide("2026-11-16' OR 1=1")).toBe(false);
  });
});

describe("ce que lit la famille", () => {
  it("« 16 → 22 nov. », ou les deux mois quand la semaine change de mois", () => {
    expect(libelleSemaine("2026-11-16")).toBe("16 → 22 nov.");
    expect(libelleSemaine("2026-11-30")).toBe("30 nov. → 6 déc.");
  });

  it("le message préparé pour Umi", () => {
    expect(lundiEnToutesLettres("2026-11-23")).toBe("lundi 23 novembre");
  });
});

describe("le menu d'une semaine", () => {
  it("le menu validé passe avant un brouillon de la même semaine", () => {
    const menus = [
      menu("brouillon", "2026-11-16", "draft", "2026-11-14"),
      menu("valide", "2026-11-16"),
    ];
    expect(menuDeLaSemaine(menus, "2026-11-16")?.id).toBe("valide");
  });

  it("sans menu validé : le brouillon le plus récent", () => {
    const menus = [
      menu("ancien", "2026-11-16", "draft", "2026-11-10"),
      menu("recent", "2026-11-16", "draft", "2026-11-14"),
    ];
    expect(menuDeLaSemaine(menus, "2026-11-16")?.id).toBe("recent");
  });

  it("un menu archivé ou d'une autre semaine n'est jamais montré", () => {
    const menus = [menu("archive", "2026-11-16", "archived"), menu("autre", "2026-11-23")];
    expect(menuDeLaSemaine(menus, "2026-11-16")).toBeNull();
  });
});

describe("le menu courant (accueil, Umi, « C'est cuisiné »)", () => {
  const cetteSemaine = "2026-11-09";

  it("celui de la semaine en cours, même si la semaine prochaine est déjà prête", () => {
    const menus = [menu("prochaine", "2026-11-16"), menu("en-cours", "2026-11-09")];
    expect(menuCourant(menus, cetteSemaine)?.id).toBe("en-cours");
  });

  it("sans menu cette semaine : le prochain à venir", () => {
    const menus = [menu("dans-2", "2026-11-23"), menu("prochaine", "2026-11-16", "draft")];
    expect(menuCourant(menus, cetteSemaine)?.id).toBe("prochaine");
  });

  it("rien à venir : le plus récent du passé, et rien du tout sans menu", () => {
    const menus = [menu("vieux", "2026-10-26"), menu("passe", "2026-11-02")];
    expect(menuCourant(menus, cetteSemaine)?.id).toBe("passe");
    expect(menuCourant([], cetteSemaine)).toBeNull();
  });
});
