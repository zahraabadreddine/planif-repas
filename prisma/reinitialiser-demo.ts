// Remet le foyer de démonstration d'Aminata dans son état de départ (npm run demo:reset).
// Supprime uniquement le compte aminata@umami.test : son foyer, ses membres, son stock, ses menus
// et ses conversations partent avec lui (suppression en cascade), puis il est recréé.
// Le catalogue doit déjà exister (npx prisma db seed).

import { PrismaClient } from "@prisma/client";
import { compteAminata } from "./donnees-foyers.ts";
import {
  afficherResultat,
  enregistrerCompte,
  enregistrerQuartiersEtMagasins,
  lireMotDePasse,
} from "./foyers.ts";

const prisma = new PrismaClient();

async function main() {
  // Vérifié avant de supprimer quoi que ce soit, pour ne pas laisser la démo sans compte.
  if (!lireMotDePasse(compteAminata.motDePasse)) {
    throw new Error(
      `${compteAminata.motDePasse} est absent du fichier .env : rien n'a été modifié.`,
    );
  }

  const { count } = await prisma.user.deleteMany({ where: { email: compteAminata.email } });
  console.log(count ? "Ancien foyer d'Aminata supprimé." : "Aucun foyer d'Aminata à supprimer.");

  const quartiers = await enregistrerQuartiersEtMagasins(prisma);
  afficherResultat(
    compteAminata.email,
    await enregistrerCompte(prisma, compteAminata, quartiers, new Date()),
  );
}

main()
  .catch((erreur: unknown) => {
    console.error("La réinitialisation de la démo a échoué.", erreur);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
