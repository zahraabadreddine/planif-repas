import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Parcours complet du partage du foyer, avec la vraie garde de session et une petite base en mémoire.

type Ligne = Record<string, unknown>;

const { auth, base, prisma } = vi.hoisted(() => {
  const base = { users: [] as Ligne[], households: [] as Ligne[], invitations: [] as Ligne[] };

  /** Filtre Prisma simplifié : égalité, NOT et { gt } (dates). */
  function correspond(ligne: Ligne, where: Ligne): boolean {
    return Object.entries(where).every(([cle, valeur]) => {
      if (cle === "NOT") return !correspond(ligne, valeur as Ligne);
      if (valeur && typeof valeur === "object" && "gt" in valeur) {
        return (ligne[cle] as Date) > (valeur as { gt: Date }).gt;
      }
      return ligne[cle] === valeur;
    });
  }
  const choisir = (ligne: Ligne, select?: Ligne) =>
    select ? Object.fromEntries(Object.keys(select).map((cle) => [cle, ligne[cle]])) : ligne;
  const modifier = (lignes: Ligne[], where: Ligne, data: Ligne) => {
    const cibles = lignes.filter((l) => correspond(l, where));
    for (const ligne of cibles) Object.assign(ligne, data);
    return { count: cibles.length };
  };

  const prisma = {
    user: {
      findUnique: async ({ where }: { where: Ligne }) => {
        const ligne = base.users.find((u) => correspond(u, where));
        if (!ligne) return null;
        const foyer = base.households.find((h) => h.id === ligne.householdId);
        return { ...ligne, household: foyer ? { ownerId: foyer.ownerId } : null };
      },
      findMany: async ({ where, select }: { where: Ligne; select: Ligne }) =>
        base.users.filter((u) => correspond(u, where)).map((u) => choisir(u, select)),
      update: async ({ where, data }: { where: Ligne; data: Ligne }) =>
        modifier(base.users, where, data),
      updateMany: async ({ where, data }: { where: Ligne; data: Ligne }) =>
        modifier(base.users, where, data),
    },
    household: {
      findUnique: async ({ where, select }: { where: Ligne; select?: Ligne }) => {
        const ligne = base.households.find((h) => correspond(h, where));
        return ligne ? choisir(ligne, select) : null;
      },
      update: async ({ where, data, select }: { where: Ligne; data: Ligne; select?: Ligne }) => {
        modifier(base.households, where, data);
        return choisir(
          base.households.find((h) => correspond(h, where))!,
          select,
        );
      },
    },
    householdInvitation: {
      count: async ({ where }: { where: Ligne }) =>
        base.invitations.filter((i) => correspond(i, where)).length,
      findMany: async ({ where, select }: { where: Ligne; select?: Ligne }) =>
        base.invitations.filter((i) => correspond(i, where)).map((i) => choisir(i, select)),
      findUnique: async ({ where, select }: { where: Ligne; select?: Ligne }) => {
        const ligne = base.invitations.find((i) => correspond(i, where));
        return ligne ? choisir(ligne, select) : null;
      },
      create: async ({ data, select }: { data: Ligne; select?: Ligne }) => {
        const ligne = { id: randomUUID(), usedAt: null, usedById: null, revokedAt: null, ...data };
        base.invitations.push(ligne);
        return choisir(ligne, select);
      },
      updateMany: async ({ where, data }: { where: Ligne; data: Ligne }) =>
        modifier(base.invitations, where, data),
    },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(prisma),
  };
  return { auth: vi.fn(), base, prisma };
});

vi.mock("@/lib/auth/config", () => ({ auth }));
vi.mock("@/lib/db", () => ({ prisma }));

process.env.AUTHSECRET = "secret-des-tests";

import { GET as lireFoyer, PUT as modifierFoyer } from "@/app/api/household/route";
import { GET as lirePartage, POST as inviter } from "@/app/api/household/invitations/route";
import { DELETE as annuler } from "@/app/api/household/invitations/[id]/route";
import { POST as rejoindre } from "@/app/api/household/join/route";
import { POST as quitter } from "@/app/api/household/leave/route";
import { DELETE as retirer, PATCH as changerDroit } from "@/app/api/household/users/[id]/route";
import { empreinteCode, limiteRejoindre } from "@/lib/foyer/invitations";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const AMINATA = id(1); // a créé le foyer f1
const KOFFI = id(2); // invité, peut modifier
const AWA = id(3); // invitée, peut seulement voir
const NOUVELLE = id(4); // sans foyer
const AUTRE = id(5); // a créé le foyer f2
const NOUVEAU = id(6); // sans foyer

const corps = (methode: string, donnees?: unknown) =>
  new Request("http://localhost/api", {
    method: methode,
    headers: { "Content-Type": "application/json" },
    body: donnees === undefined ? undefined : JSON.stringify(donnees),
  });
const params = (valeur: string) => ({ params: Promise.resolve({ id: valeur }) });
const compte = (userId: string) => base.users.find((u) => u.id === userId)!;

function connecter(userId: string) {
  auth.mockResolvedValue({ user: { id: userId } });
}

async function creerCode(access: "edit" | "view" = "edit"): Promise<string> {
  connecter(AMINATA);
  const reponse = await inviter(corps("POST", { access }));
  expect(reponse.status).toBe(201);
  return (await reponse.json()).invitation.code;
}

async function rejoindreAvec(userId: string, code: string) {
  connecter(userId);
  return rejoindre(corps("POST", { code }));
}

beforeEach(() => {
  const utilisatrice = (
    userId: string,
    fullName: string,
    foyer: string | null,
    droit: unknown,
  ) => ({
    id: userId,
    fullName,
    role: "user",
    householdId: foyer,
    householdAccess: droit,
  });
  base.users = [
    utilisatrice(AMINATA, "Aminata Koné", "f1", null),
    utilisatrice(KOFFI, "Koffi Koné", "f1", "edit"),
    utilisatrice(AWA, "Awa Koné", "f1", "view"),
    utilisatrice(NOUVELLE, "Fatou Bamba", null, null),
    utilisatrice(AUTRE, "Yao Kouassi", "f2", null),
    utilisatrice(NOUVEAU, "Moussa Traoré", null, null),
  ];
  base.households = [
    {
      id: "f1",
      ownerId: AMINATA,
      name: "Famille Koné",
      weeklyBudgetFcfa: 25000,
      cuisinesPreferred: [],
      shoppingDay: 6,
    },
    {
      id: "f2",
      ownerId: AUTRE,
      name: "Famille Kouassi",
      weeklyBudgetFcfa: 30000,
      cuisinesPreferred: [],
      shoppingDay: null,
    },
  ];
  base.invitations = [];
  for (const userId of [NOUVELLE, NOUVEAU]) limiteRejoindre.reinitialiser(userId);
});

describe("inviter une autre personne dans le foyer", () => {
  it("deux comptes voient le même foyer après l'invitation", async () => {
    const code = await creerCode("edit");
    const reponse = await rejoindreAvec(NOUVELLE, code);
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ access: "edit" });

    connecter(AMINATA);
    const foyerAminata = (await (await lireFoyer()).json()).household;
    connecter(NOUVELLE);
    const foyerFatou = (await (await lireFoyer()).json()).household;
    expect(foyerFatou).toEqual(foyerAminata);
    expect(foyerFatou).toMatchObject({ id: "f1", name: "Famille Koné" });
  });

  it("ne stocke jamais le code en clair, seulement son empreinte", async () => {
    const code = await creerCode();
    const [invitation] = base.invitations;
    expect(invitation.codeHash).toBe(empreinteCode(code));
    expect(JSON.stringify(invitation)).not.toContain(code);
  });

  it("donne un code de 6 caractères valable 48 h", async () => {
    const avant = Date.now();
    const code = await creerCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
    const expire = (base.invitations[0].expiresAt as Date).getTime();
    expect(expire - avant).toBeGreaterThanOrEqual(48 * 3600 * 1000 - 1000);
    expect(expire - avant).toBeLessThanOrEqual(48 * 3600 * 1000 + 1000);
  });

  it("accepte le code tapé en minuscules ou avec un espace", async () => {
    const code = await creerCode();
    const tape = `${code.slice(0, 3).toLowerCase()} ${code.slice(3)}`;
    expect((await rejoindreAvec(NOUVELLE, tape)).status).toBe(200);
  });

  it("donne à la personne le droit choisi par le propriétaire", async () => {
    await rejoindreAvec(NOUVELLE, await creerCode("view"));
    expect(compte(NOUVELLE)).toMatchObject({ householdId: "f1", householdAccess: "view" });
  });

  it("refuse un identifiant de foyer glissé dans la requête", async () => {
    connecter(AMINATA);
    expect((await inviter(corps("POST", { access: "edit", householdId: "f2" }))).status).toBe(400);
    expect(base.invitations).toHaveLength(0);
  });

  it("limite à 5 codes en attente par foyer", async () => {
    for (let i = 0; i < 5; i += 1) await creerCode();
    connecter(AMINATA);
    expect((await inviter(corps("POST", { access: "edit" }))).status).toBe(409);
  });
});

describe("codes refusés", () => {
  async function refuse(code: string) {
    const reponse = await rejoindreAvec(NOUVEAU, code);
    expect(reponse.status).toBe(400);
    expect((await reponse.json()).error.code).toBe("CODEINVALIDE");
    expect(compte(NOUVEAU).householdId).toBeNull();
  }

  it("refuse un code déjà utilisé : il ne sert qu'une fois", async () => {
    const code = await creerCode();
    await rejoindreAvec(NOUVELLE, code);
    await refuse(code);
  });

  it("refuse un code expiré", async () => {
    const code = await creerCode();
    base.invitations[0].expiresAt = new Date(Date.now() - 1000);
    await refuse(code);
  });

  it("refuse un code annulé par le propriétaire", async () => {
    const code = await creerCode();
    connecter(AMINATA);
    expect((await annuler(corps("DELETE"), params(base.invitations[0].id as string))).status).toBe(
      200,
    );
    await refuse(code);
  });

  it("refuse un code inconnu avec le même message", async () => {
    await refuse("ZZZ999");
  });

  it("bloque après 5 mauvais codes, comme la connexion", async () => {
    const code = await creerCode();
    for (let i = 0; i < 5; i += 1) await refuse("ZZZ999");
    expect((await rejoindreAvec(NOUVEAU, code)).status).toBe(429);
    expect(compte(NOUVEAU).householdId).toBeNull();
  });

  it("refuse un compte qui a déjà un foyer, créé ou rejoint", async () => {
    const code = await creerCode();
    expect((await rejoindreAvec(AUTRE, code)).status).toBe(409);
    expect((await rejoindreAvec(KOFFI, code)).status).toBe(409);
    expect(compte(AUTRE).householdId).toBe("f2");
    expect(base.invitations[0].usedAt).toBeNull();
  });
});

describe("droits dans le foyer", () => {
  it("seule la personne qui a créé le foyer peut inviter", async () => {
    for (const userId of [KOFFI, AWA]) {
      connecter(userId);
      expect((await inviter(corps("POST", { access: "edit" }))).status).toBe(403);
    }
    connecter(NOUVELLE);
    expect((await inviter(corps("POST", { access: "edit" }))).status).toBe(409);
    expect(base.invitations).toHaveLength(0);
  });

  it("une personne en lecture seule ne peut rien modifier dans le foyer (403)", async () => {
    connecter(AWA);
    const reponse = await modifierFoyer(
      corps("PUT", {
        name: "Autre nom",
        weeklyBudgetFcfa: 1000,
        cuisinesPreferred: [],
        shoppingDay: null,
      }),
    );
    expect(reponse.status).toBe(403);
    expect((await reponse.json()).error.code).toBe("LECTURESEULE");
    expect(base.households[0].name).toBe("Famille Koné");
  });

  it("une personne qui peut modifier change le foyer partagé", async () => {
    connecter(KOFFI);
    const reponse = await modifierFoyer(
      corps("PUT", {
        name: "Famille Koné",
        weeklyBudgetFcfa: 28000,
        cuisinesPreferred: [],
        shoppingDay: 6,
      }),
    );
    expect(reponse.status).toBe(200);
    expect(base.households[0].weeklyBudgetFcfa).toBe(28000);
  });

  it("le propriétaire change le droit d'une personne invitée", async () => {
    connecter(AMINATA);
    expect((await changerDroit(corps("PATCH", { access: "view" }), params(KOFFI))).status).toBe(
      200,
    );
    expect(compte(KOFFI).householdAccess).toBe("view");
  });

  it("le propriétaire retire une personne : son compte reste, sans foyer", async () => {
    connecter(AMINATA);
    expect((await retirer(corps("DELETE"), params(AWA))).status).toBe(200);
    expect(compte(AWA)).toMatchObject({ householdId: null, householdAccess: null });
  });

  it("le propriétaire ne peut pas se retirer ni changer son propre droit", async () => {
    connecter(AMINATA);
    expect((await retirer(corps("DELETE"), params(AMINATA))).status).toBe(404);
    expect((await changerDroit(corps("PATCH", { access: "view" }), params(AMINATA))).status).toBe(
      404,
    );
    expect(compte(AMINATA).householdId).toBe("f1");
  });

  it("une personne invitée ne peut ni retirer ni changer le droit d'une autre", async () => {
    connecter(KOFFI);
    expect((await retirer(corps("DELETE"), params(AWA))).status).toBe(403);
    expect((await changerDroit(corps("PATCH", { access: "edit" }), params(AWA))).status).toBe(403);
    expect(compte(AWA)).toMatchObject({ householdId: "f1", householdAccess: "view" });
  });

  it("une personne invitée quitte le foyer ; le propriétaire ne peut pas", async () => {
    connecter(KOFFI);
    expect((await quitter()).status).toBe(200);
    expect(compte(KOFFI)).toMatchObject({ householdId: null, householdAccess: null });
    connecter(AMINATA);
    expect((await quitter()).status).toBe(403);
    expect(compte(AMINATA).householdId).toBe("f1");
  });
});

describe("un compte A ne touche jamais au foyer d'un compte B", () => {
  it("ne peut pas annuler le code d'un autre foyer", async () => {
    await creerCode();
    connecter(AUTRE);
    expect((await annuler(corps("DELETE"), params(base.invitations[0].id as string))).status).toBe(
      404,
    );
    expect(base.invitations[0].revokedAt).toBeNull();
  });

  it("ne peut pas retirer ni changer le droit d'une personne d'un autre foyer", async () => {
    connecter(AUTRE);
    expect((await retirer(corps("DELETE"), params(KOFFI))).status).toBe(404);
    expect((await changerDroit(corps("PATCH", { access: "view" }), params(KOFFI))).status).toBe(
      404,
    );
    expect(compte(KOFFI)).toMatchObject({ householdId: "f1", householdAccess: "edit" });
  });

  it("ne voit que les comptes de son foyer, et les codes seulement s'il l'a créé", async () => {
    await creerCode();
    connecter(AUTRE);
    const partageAutre = await (await lirePartage()).json();
    expect(partageAutre.personnes.map((p: { id: string }) => p.id)).toEqual([AUTRE]);
    expect(partageAutre.invitations).toEqual([]);

    connecter(KOFFI);
    const partageKoffi = await (await lirePartage()).json();
    expect(partageKoffi.personnes.map((p: { id: string }) => p.id)).toEqual([AMINATA, KOFFI, AWA]);
    expect(partageKoffi.personnes[0].acces).toBe("proprietaire");
    expect(partageKoffi.invitations).toEqual([]);
  });
});
