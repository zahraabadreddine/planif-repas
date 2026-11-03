import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const { listerCatalogue, lireRecette, exigerSession } = vi.hoisted(() => ({
  listerCatalogue: vi.fn(),
  lireRecette: vi.fn(),
  exigerSession: vi.fn(),
}));

vi.mock("@/lib/catalogue/recettes", () => ({ listerCatalogue, lireRecette }));
vi.mock("@/lib/auth/garde", () => ({ exigerSession }));

import { GET as lister } from "@/app/api/recipes/route";
import { GET as lire } from "@/app/api/recipes/[id]/route";

const session = { userId: "u1", role: "user", householdId: "f1" };
const contexte = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  for (const fn of [listerCatalogue, lireRecette, exigerSession]) fn.mockReset();
  exigerSession.mockResolvedValue(session);
  listerCatalogue.mockResolvedValue({ recettes: [], masquees: 0 });
});

describe("GET /api/recipes", () => {
  it("refuse une requête sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    expect((await lister(new Request("http://localhost/api/recipes"))).status).toBe(401);
    expect(listerCatalogue).not.toHaveBeenCalled();
  });

  it("transmet les filtres lus dans l'adresse, avec la session", async () => {
    const reponse = await lister(
      new Request("http://localhost/api/recipes?q=poulet&temps=45&cuisine=italienne"),
    );
    expect(reponse.status).toBe(200);
    expect(listerCatalogue).toHaveBeenCalledWith(session, {
      q: "poulet",
      temps: 45,
      cuisine: "italienne",
    });
    expect(await reponse.json()).toEqual({ recipes: [], hidden: 0 });
  });

  it("ignore un filtre mal écrit", async () => {
    await lister(new Request("http://localhost/api/recipes?temps=abc&householdId=foyer-b"));
    expect(listerCatalogue).toHaveBeenCalledWith(session, {});
  });
});

describe("GET /api/recipes/:id", () => {
  it("refuse une requête sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    expect((await lire(new Request("http://localhost"), contexte("r1"))).status).toBe(401);
  });

  it("répond introuvable pour une recette inexistante ou non validée", async () => {
    lireRecette.mockResolvedValue(null);
    expect((await lire(new Request("http://localhost"), contexte("r1"))).status).toBe(404);
  });

  it("renvoie la fiche de la recette", async () => {
    lireRecette.mockResolvedValue({ id: "r1", title: "Taboulé" });
    const reponse = await lire(new Request("http://localhost"), contexte("r1"));
    expect(reponse.status).toBe(200);
    expect((await reponse.json()).recipe.title).toBe("Taboulé");
    expect(lireRecette).toHaveBeenCalledWith(session, "r1");
  });
});
