import { describe, expect, it } from "vitest";
import { MealSlot, PlaceType, ProposalStatus, Severity, StockStatus } from "@prisma/client";

// Vérifie que le client généré expose les énumérations attendues par CLAUDE.md (section 8).
describe("schéma Prisma", () => {
  it("expose les créneaux de repas", () => {
    expect(Object.values(MealSlot)).toEqual(["breakfast", "lunch", "dinner"]);
  });

  it("expose les types de lieu d'achat", () => {
    expect(Object.values(PlaceType)).toEqual(["market", "supermarket", "shop"]);
  });

  it("distingue les restrictions strictes des préférences", () => {
    expect(Object.values(Severity)).toEqual(["strict", "preference"]);
  });

  it("prévoit le statut « à consommer vite » du stock", () => {
    expect(Object.values(StockStatus)).toContain("useSoon");
  });

  it("prévoit l'expiration des propositions de l'agent", () => {
    expect(Object.values(ProposalStatus)).toEqual(["pending", "accepted", "rejected", "expired"]);
  });
});
