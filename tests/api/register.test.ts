import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const { findUnique, create } = vi.hoisted(() => ({ findUnique: vi.fn(), create: vi.fn() }));

vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique, create } } }));
vi.mock("@/lib/auth/motdepasse", () => ({
  hacherMotDePasse: vi.fn(async () => "empreinte"),
}));

import { POST } from "@/app/api/register/route";

const corpsValide = {
  fullName: "Aminata Koné",
  email: "Aminata@Exemple.ci",
  password: "motdepasse",
  consentHealth: true,
  consentLocation: false,
};

function requete(corps: unknown) {
  return new Request("http://localhost/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
}

beforeEach(() => {
  findUnique.mockReset();
  create.mockReset();
});

describe("POST /api/register", () => {
  it("crée le compte avec le mot de passe haché et les consentements datés", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "u1", email: "aminata@exemple.ci", fullName: "Aminata Koné" });

    const reponse = await POST(requete(corpsValide));

    expect(reponse.status).toBe(201);
    const { data } = create.mock.calls[0][0];
    expect(data.email).toBe("aminata@exemple.ci");
    expect(data.passwordHash).toBe("empreinte");
    expect(data.consentHealthAt).toBeInstanceOf(Date);
    expect(data.consentLocationAt).toBeNull();
    expect(JSON.stringify(await reponse.json())).not.toContain("motdepasse");
  });

  it("refuse un email déjà utilisé", async () => {
    findUnique.mockResolvedValue({ id: "u1" });
    const reponse = await POST(requete(corpsValide));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).error.code).toBe("EMAILDEJAPRIS");
    expect(create).not.toHaveBeenCalled();
  });

  it("refuse des données invalides avec le détail par champ", async () => {
    const reponse = await POST(requete({ ...corpsValide, password: "court" }));
    expect(reponse.status).toBe(400);
    const corps = await reponse.json();
    expect(corps.error.code).toBe("DONNEESINVALIDES");
    expect(corps.error.champs.password).toBeDefined();
  });

  it("refuse un JSON illisible", async () => {
    const reponse = await POST(
      new Request("http://localhost/api/register", { method: "POST", body: "{pas du json" }),
    );
    expect(reponse.status).toBe(400);
  });

  it("répond 409 si deux inscriptions simultanées prennent le même email", async () => {
    findUnique.mockResolvedValue(null);
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    const reponse = await POST(requete(corpsValide));
    expect(reponse.status).toBe(409);
  });
});
