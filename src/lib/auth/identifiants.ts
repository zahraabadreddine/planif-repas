import { CredentialsSignin } from "@auth/core/errors";
import { prisma } from "@/lib/db";
import { connexionSchema } from "@/lib/validation/compte";
import { limiteConnexion } from "./limite";
import { hacherMotDePasse, verifierMotDePasse } from "./motdepasse";

/** Levée quand un email a épuisé ses tentatives : le code est renvoyé au formulaire. */
export class TropDeTentatives extends CredentialsSignin {
  code = "TROPDEREQUETES";
}

// Empreinte factice : quand l'email est inconnu, on compare quand même un mot de passe,
// pour que le temps de réponse ne révèle pas si un compte existe.
let empreinteFactice: Promise<string> | undefined;
function obtenirEmpreinteFactice(): Promise<string> {
  empreinteFactice ??= hacherMotDePasse("compte-inexistant");
  return empreinteFactice;
}

async function chercherUtilisatrice(email: string, password: string) {
  const utilisatrice = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, fullName: true, role: true, passwordHash: true },
  });
  if (!utilisatrice) {
    await verifierMotDePasse(password, await obtenirEmpreinteFactice());
    return null;
  }
  if (!(await verifierMotDePasse(password, utilisatrice.passwordHash))) return null;
  return utilisatrice;
}

/** Vérifie email et mot de passe. Renvoie l'utilisatrice, ou null si les identifiants sont faux. */
export async function verifierIdentifiants(identifiants: unknown) {
  const resultat = connexionSchema.safeParse(identifiants);
  if (!resultat.success) return null;
  const { email, password } = resultat.data;

  if (limiteConnexion.estBloque(email)) throw new TropDeTentatives();

  const utilisatrice = await chercherUtilisatrice(email, password);
  if (!utilisatrice) {
    limiteConnexion.noterEchec(email);
    return null;
  }
  limiteConnexion.reinitialiser(email);

  return {
    id: utilisatrice.id,
    email: utilisatrice.email,
    name: utilisatrice.fullName,
    role: utilisatrice.role,
  };
}
