import { describe, it, expect } from "vitest";
import { transitionAutorisee } from "@/lib/delivery/transitions";

describe("transitionAutorisee – famille", () => {
  const ok: [string, string][] = [
    ["pending", "cancelled"],
    ["confirmed", "cancelled"],
    ["delivered", "received"],
  ];
  for (const [de, vers] of ok) {
    it(`autorise ${de} → ${vers}`, () => {
      expect(transitionAutorisee(de, vers, "famille")).toBe(true);
    });
  }

  const ko: [string, string][] = [
    ["pending", "confirmed"],
    ["pending", "delivering"],
    ["pending", "delivered"],
    ["pending", "received"],
    ["confirmed", "delivering"],
    ["confirmed", "delivered"],
    ["confirmed", "received"],
    ["delivering", "delivered"],
    ["delivering", "cancelled"],
    ["delivering", "received"],
    ["delivered", "cancelled"],
    ["received", "cancelled"],
    ["cancelled", "pending"],
  ];
  for (const [de, vers] of ko) {
    it(`refuse ${de} → ${vers}`, () => {
      expect(transitionAutorisee(de, vers, "famille")).toBe(false);
    });
  }
});

describe("transitionAutorisee – chauffeur", () => {
  const ok: [string, string][] = [
    ["confirmed", "delivering"],
    ["delivering", "delivered"],
  ];
  for (const [de, vers] of ok) {
    it(`autorise ${de} → ${vers}`, () => {
      expect(transitionAutorisee(de, vers, "chauffeur")).toBe(true);
    });
  }

  const ko: [string, string][] = [
    ["pending", "confirmed"],
    ["pending", "cancelled"],
    ["confirmed", "delivered"],
    ["confirmed", "cancelled"],
    ["delivering", "cancelled"],
    ["delivering", "received"],
    ["delivered", "received"],
  ];
  for (const [de, vers] of ko) {
    it(`refuse ${de} → ${vers}`, () => {
      expect(transitionAutorisee(de, vers, "chauffeur")).toBe(false);
    });
  }
});
