import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const { prisma, exigerSession, exigerEcriture, lireListe } = vi.hoisted(() => ({
  prisma: { shoppingList: { update: vi.fn() } },
  exigerSession: vi.fn(),
  exigerEcriture: vi.fn(),
  lireListe: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/auth/garde", () => ({ exigerSession, exigerEcriture }));
vi.mock("@/lib/courses/generation", () => ({ lireListe }));

import { GET, POST } from "@/app/api/shopping-lists/[id]/share/route";

const LISTE = "8f2b4c1e-3d5a-4e6f-9a7b-1c2d3e4f5a6b";
const SESSION = { userId: "u1", role: "user", householdId: "f1", acces: "edit" };
const contexte = (id = LISTE) => ({ params: Promise.resolve({ id }) });
const requete = () => new Request("http://localhost/api/shopping-lists/x/share");

beforeEach(() => {
  vi.clearAllMocks();
  exigerSession.mockResolvedValue(SESSION);
  exigerEcriture.mockResolvedValue(SESSION);
  lireListe.mockResolvedValue({
    id: LISTE,
    mealPlanId: "m1",
    estimatedTotalFcfa: 2500,
    remainingFcfa: 2500,
    sharedAt: null,
    items: [
      {
        id: "a1",
        ingredientId: "i1",
        ingredient: "Tomate",
        quantity: 3,
        unit: "tas",
        estimatedPriceFcfa: 1500,
        placeType: "market",
        checked: false,
      },
    ],
  });
});

describe("partage WhatsApp d'une liste", () => {
  it("GET renvoie le texte et le lien sans rien écrire en base", async () => {
    const reponse = await GET(requete(), contexte());
    expect(reponse.status).toBe(200);
    const corps = await reponse.json();
    expect(corps.link).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(corps.text).toContain("Tomate");
    expect(prisma.shoppingList.update).not.toHaveBeenCalled();
  });

  it("POST note la date du partage", async () => {
    expect((await POST(requete(), contexte())).status).toBe(200);
    expect(prisma.shoppingList.update).toHaveBeenCalledWith({
      where: { id: LISTE },
      data: { sharedAt: expect.any(Date) },
    });
  });

  it("POST est refusé en lecture seule (403), sans rien écrire", async () => {
    exigerEcriture.mockRejectedValue(new ErreurApi("LECTURESEULE"));
    expect((await POST(requete(), contexte())).status).toBe(403);
    expect(prisma.shoppingList.update).not.toHaveBeenCalled();
  });

  it("la liste d'un autre foyer est introuvable, et rien n'est écrit", async () => {
    lireListe.mockRejectedValue(new ErreurApi("INTROUVABLE"));
    expect((await POST(requete(), contexte())).status).toBe(404);
    expect(prisma.shoppingList.update).not.toHaveBeenCalled();
  });

  it("un identifiant mal formé est introuvable", async () => {
    expect((await GET(requete(), contexte("pas-un-id"))).status).toBe(404);
  });
});
