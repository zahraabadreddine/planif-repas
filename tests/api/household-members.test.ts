import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurApi } from "@/lib/erreurs";

const { householdMember, memberRestriction, user, exigerSession } = vi.hoisted(() => ({
  householdMember: {
    create: vi.fn(),
    updateMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    deleteMany: vi.fn(),
  },
  memberRestriction: { deleteMany: vi.fn(), createMany: vi.fn() },
  user: { findUnique: vi.fn() },
  exigerSession: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const prisma = {
    householdMember,
    memberRestriction,
    user,
    $transaction: (fn: (tx: unknown) => unknown) => fn(prisma),
  };
  return { prisma };
});
// exigerEcriture renvoie la même session : son refus en lecture seule est testé dans garde.test.ts
vi.mock("@/lib/auth/garde", () => ({ exigerSession, exigerEcriture: exigerSession }));

import { POST } from "@/app/api/household/members/route";
import { DELETE, PUT } from "@/app/api/household/members/[id]/route";

const ID = "8f2b4c1e-3d5a-4e6f-9a7b-1c2d3e4f5a6b";
const contexte = (id = ID) => ({ params: Promise.resolve({ id }) });

function requete(methode: string, corps?: unknown) {
  return new Request("http://localhost/api/household/members", {
    method: methode,
    headers: { "Content-Type": "application/json" },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
}

const sansSante = {
  label: "Papa",
  birthDate: null,
  ageGroup: "adult",
  allergies: [],
  autresAllergies: [],
  regimes: [],
};
const avecAllergie = {
  ...sansSante,
  label: "Awa",
  birthDate: "2019-03-12",
  ageGroup: null,
  allergies: ["arachide"],
  autresAllergies: ["Gombo"],
};

const ligne = (donnees: Record<string, unknown> = {}) => ({
  id: ID,
  label: "Awa",
  ageGroup: "child",
  birthDate: new Date("2019-03-12T00:00:00Z"),
  restrictions: [
    { type: "allergy", value: "arachide" },
    { type: "allergy", value: "Gombo" },
  ],
  ...donnees,
});

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-10-14T12:00:00Z"), toFake: ["Date"] });
  for (const fn of [
    ...Object.values(householdMember),
    ...Object.values(memberRestriction),
    user.findUnique,
    exigerSession,
  ]) {
    fn.mockReset();
  }
  exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: "f1" });
  user.findUnique.mockResolvedValue({ consentHealthAt: new Date("2026-01-01") });
});

afterEach(() => vi.useRealTimers());

describe("POST /api/household/members", () => {
  it("refuse une requête sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    expect((await POST(requete("POST", sansSante))).status).toBe(401);
    expect(householdMember.create).not.toHaveBeenCalled();
  });

  it("refuse une personne invitée en lecture seule (403), sans rien écrire", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("LECTURESEULE"));
    expect((await POST(requete("POST", sansSante))).status).toBe(403);
    expect((await DELETE(requete("DELETE"), contexte())).status).toBe(403);
    expect(householdMember.create).not.toHaveBeenCalled();
    expect(householdMember.deleteMany).not.toHaveBeenCalled();
  });

  it("demande de décrire d'abord le foyer", async () => {
    exigerSession.mockResolvedValue({ userId: "u1", role: "user", householdId: null });
    const reponse = await POST(requete("POST", sansSante));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).error.code).toBe("FOYERMANQUANT");
  });

  it("refuse une allergie sans consentement santé, sans rien enregistrer", async () => {
    user.findUnique.mockResolvedValue({ consentHealthAt: null });
    const reponse = await POST(requete("POST", avecAllergie));
    expect(reponse.status).toBe(403);
    expect((await reponse.json()).error.code).toBe("CONSENTEMENTREQUIS");
    expect(householdMember.create).not.toHaveBeenCalled();
  });

  it("n'exige pas le consentement pour un membre sans allergie ni régime", async () => {
    user.findUnique.mockResolvedValue({ consentHealthAt: null });
    householdMember.create.mockResolvedValue(
      ligne({ label: "Papa", ageGroup: "adult", birthDate: null, restrictions: [] }),
    );
    expect((await POST(requete("POST", sansSante))).status).toBe(201);
  });

  it("ajoute le membre au foyer de la session, avec des restrictions strictes", async () => {
    householdMember.create.mockResolvedValue(ligne());
    const reponse = await POST(requete("POST", avecAllergie));
    expect(reponse.status).toBe(201);
    const { data } = householdMember.create.mock.calls[0][0];
    expect(data.householdId).toBe("f1");
    expect(data.restrictions.create).toEqual([
      { type: "allergy", value: "arachide", severity: "strict" },
      { type: "allergy", value: "Gombo", severity: "strict" },
    ]);
    const { member } = await reponse.json();
    expect(member).toMatchObject({
      age: 7,
      allergies: ["arachide"],
      autresAllergies: ["Gombo"],
      birthDate: "2019-03-12",
    });
  });

  it("déduit la tranche d'âge de la date, sans faire confiance au navigateur", async () => {
    householdMember.create.mockResolvedValue(ligne());
    await POST(requete("POST", { ...avecAllergie, ageGroup: "senior" }));
    expect(householdMember.create.mock.calls[0][0].data.ageGroup).toBe("child");
  });

  it("refuse un identifiant de foyer glissé dans la requête", async () => {
    const reponse = await POST(requete("POST", { ...sansSante, householdId: "foyer-b" }));
    expect(reponse.status).toBe(400);
    expect(householdMember.create).not.toHaveBeenCalled();
  });
});

describe("PUT /api/household/members/:id", () => {
  it("recalcule la tranche d'âge à la lecture : un enfant enregistré à 11 ans est ado à 13", async () => {
    householdMember.updateMany.mockResolvedValue({ count: 1 });
    householdMember.findUniqueOrThrow.mockResolvedValue(
      ligne({ ageGroup: "child", birthDate: new Date("2013-01-01T00:00:00Z") }),
    );
    const { member } = await (await PUT(requete("PUT", avecAllergie), contexte())).json();
    expect(member).toMatchObject({ age: 13, ageGroup: "teen" });
  });

  it("modifie un membre du foyer de la session et remplace ses restrictions", async () => {
    householdMember.updateMany.mockResolvedValue({ count: 1 });
    householdMember.findUniqueOrThrow.mockResolvedValue(ligne());
    const reponse = await PUT(requete("PUT", avecAllergie), contexte());
    expect(reponse.status).toBe(200);
    expect(householdMember.updateMany.mock.calls[0][0].where).toEqual({
      id: ID,
      householdId: "f1",
    });
    expect(memberRestriction.deleteMany).toHaveBeenCalledWith({ where: { memberId: ID } });
  });

  it("empêche un compte A de modifier un membre du foyer d'un compte B", async () => {
    // Le membre existe, mais pas dans le foyer f1 : la mise à jour filtrée ne touche aucune ligne.
    householdMember.updateMany.mockResolvedValue({ count: 0 });
    const reponse = await PUT(requete("PUT", avecAllergie), contexte());
    expect(reponse.status).toBe(404);
    expect(memberRestriction.deleteMany).not.toHaveBeenCalled();
    expect(memberRestriction.createMany).not.toHaveBeenCalled();
  });

  it("répond introuvable pour un identifiant mal formé", async () => {
    const reponse = await PUT(requete("PUT", avecAllergie), contexte("pas-un-uuid"));
    expect(reponse.status).toBe(404);
    expect(householdMember.updateMany).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/household/members/:id", () => {
  it("retire un membre du foyer de la session", async () => {
    householdMember.deleteMany.mockResolvedValue({ count: 1 });
    const reponse = await DELETE(requete("DELETE"), contexte());
    expect(reponse.status).toBe(200);
    expect(householdMember.deleteMany).toHaveBeenCalledWith({
      where: { id: ID, householdId: "f1" },
    });
  });

  it("empêche un compte A de retirer un membre du foyer d'un compte B", async () => {
    householdMember.deleteMany.mockResolvedValue({ count: 0 });
    expect((await DELETE(requete("DELETE"), contexte())).status).toBe(404);
  });

  it("refuse une requête sans session", async () => {
    exigerSession.mockRejectedValue(new ErreurApi("NONCONNECTE"));
    expect((await DELETE(requete("DELETE"), contexte())).status).toBe(401);
    expect(householdMember.deleteMany).not.toHaveBeenCalled();
  });
});
