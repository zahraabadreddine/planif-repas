import Link from "next/link";
import { PageHeader } from "@/components/titre-page";
import { ChevronRight } from "@/components/icones";
import { fcfa } from "@/lib/format";
import { listerMembres, type MembreFoyer } from "@/lib/foyer/membres";
import { platsDuFoyer } from "@/lib/foyer/notes";
import { lireFoyer } from "@/lib/foyer/profil";
import { CUISINES } from "@/lib/validation/foyer";
import { ALLERGENES, REGIMES } from "@/lib/validation/membre";
import { sessionDeLaPage } from "./commun";
import { ProfilFoyer } from "./profil-foyer";

// Sommaire « Mon foyer » : une carte courte par sujet, chacune ouvre sa page (EF-03, EF-04).

function Carte({ href, titre, detail }: { href: string; titre: string; detail: string }) {
  return (
    <li>
      <Link
        href={href}
        className="press paper-shadow flex min-h-[72px] items-center gap-3 rounded-[20px_16px_22px_18px] border-[2.5px] border-foret bg-creme px-4 py-3"
      >
        <span className="flex-1">
          <span className="block font-display text-lg font-semibold leading-tight text-foret">
            {titre}
          </span>
          <span className="block text-sm font-bold text-cacao">{detail}</span>
        </span>
        <ChevronRight size={22} strokeWidth={2.8} />
      </Link>
    </li>
  );
}

/** « Awa : arachide · Papa : végétarien », ou un rappel s'il n'y a encore personne. */
function resumeMembres(membres: MembreFoyer[]): string {
  if (membres.length === 0) return "Ajoute les personnes qui mangent à la maison";
  const libelle = (valeur: string) =>
    [...ALLERGENES, ...REGIMES].find((x) => x.valeur === valeur)?.libelle.toLowerCase() ?? valeur;
  const avecRestrictions = membres
    .map((m) => ({
      surnom: m.label,
      restrictions: [...m.allergies.map(libelle), ...m.autresAllergies, ...m.regimes.map(libelle)],
    }))
    .filter((m) => m.restrictions.length > 0);
  if (avecRestrictions.length === 0) return "Aucune allergie ni régime";
  return avecRestrictions.map((m) => `${m.surnom} : ${m.restrictions.join(", ")}`).join(" · ");
}

export default async function FoyerPage() {
  const session = await sessionDeLaPage();
  const [foyer, membres, plats] = await Promise.all([
    lireFoyer(session),
    listerMembres(session),
    platsDuFoyer(session),
  ]);

  // Sans foyer, la première étape est de le décrire : le formulaire s'affiche directement.
  if (!foyer) {
    return (
      <>
        <PageHeader overline="Mon foyer" title="Bienvenue" />
        <ProfilFoyer foyer={null} />
        <ul className="mt-6 flex flex-col gap-3">
          <Carte href="/foyer/compte" titre="Mon compte" detail="Mot de passe, déconnexion" />
        </ul>
      </>
    );
  }

  const cuisines = CUISINES.filter((c) => foyer.cuisinesPreferred.includes(c.valeur)).map((c) =>
    c.libelle.toLowerCase(),
  );
  const notes = plats.filter((p) => p.rating !== null).length;
  const aDecouvrir = plats.length - notes;

  return (
    <>
      <PageHeader overline="Mon foyer" title="Réglages" />
      <ul className="mt-6 flex flex-col gap-3">
        <Carte
          href="/foyer/profil"
          titre={foyer.name}
          detail={`${fcfa(foyer.weeklyBudgetFcfa)} / semaine · ${
            cuisines.length > 0 ? cuisines.join(", ") : "toutes cuisines"
          }`}
        />
        <Carte
          href="/foyer/membres"
          titre={`Membres${membres.length > 0 ? ` (${membres.length})` : ""}`}
          detail={resumeMembres(membres)}
        />
        <Carte
          href="/foyer/plats"
          titre={`Vos plats${notes > 0 ? ` (${notes} notés)` : ""}`}
          detail={
            notes === 0
              ? "Note quelques plats pour des menus à votre goût"
              : `${aDecouvrir} à découvrir`
          }
        />
        <Carte href="/foyer/compte" titre="Mon compte" detail="Mot de passe, déconnexion" />
      </ul>
    </>
  );
}
