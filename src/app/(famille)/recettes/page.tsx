import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/titre-page";
import { UrgencyButton } from "@/components/bouton-urgence";
import { ArrowRight } from "@/components/icones";
import { exigerSession } from "@/lib/auth/garde";
import { listerCatalogue } from "@/lib/catalogue/recettes";
import type { RecetteResume } from "@/lib/catalogue/recherche";
import { ErreurApi } from "@/lib/erreurs";
import { cx, fcfa } from "@/lib/format";
import { COUTS, TEMPS, lireFiltres, type Filtres } from "@/lib/validation/catalogue";
import { CUISINES } from "@/lib/validation/foyer";

// Catalogue des recettes validées (EF-20). Les filtres sont dans l'adresse : de simples liens,
// sans code à charger, pour rester rapide en 4G.

type Parametres = Record<string, string | string[] | undefined>;

/** Adresse du catalogue avec les filtres actuels, modifiés par `changement`. */
function lien(filtres: Filtres, changement: Partial<Record<keyof Filtres, string | undefined>>) {
  const valeurs = { ...filtres, ...changement };
  const parametres = new URLSearchParams();
  for (const [cle, valeur] of Object.entries(valeurs)) {
    if (valeur !== undefined && valeur !== "") parametres.set(cle, String(valeur));
  }
  const texte = parametres.toString();
  return texte ? `/recettes?${texte}` : "/recettes";
}

const pastille = (active: boolean) =>
  cx(
    "press flex min-h-11 shrink-0 items-center rounded-full border-[2.5px] border-foret px-3.5 text-sm font-bold",
    active ? "bg-palme text-creme" : "bg-creme text-foret",
  );

function LigneDeFiltres({
  titre,
  choix,
}: {
  titre: string;
  choix: { libelle: string; href: string; actif: boolean }[];
}) {
  return (
    <div className="mt-3">
      <p className="text-sm font-extrabold text-foret">{titre}</p>
      <div className="-mx-5 mt-1.5 flex gap-2 overflow-x-auto px-5 pb-1">
        {choix.map((c) => (
          <Link key={c.libelle} href={c.href} className={pastille(c.actif)} aria-current={c.actif}>
            {c.libelle}
          </Link>
        ))}
      </div>
    </div>
  );
}

function CarteRecette({ recette }: { recette: RecetteResume }) {
  const incompatible = recette.incompatibilites.length > 0;
  return (
    <li>
      <Link
        href={`/recettes/${recette.id}`}
        className={cx(
          "press paper-shadow flex items-center gap-3 rounded-[20px_16px_22px_18px] border-[2.5px] bg-creme p-4",
          incompatible ? "border-carmin" : "border-foret",
        )}
      >
        <span className="flex-1">
          <span className="block font-display text-lg font-semibold leading-tight text-foret">
            {recette.title}
          </span>
          <span className="block text-sm font-bold text-cacao">
            {recette.cuisine} · {recette.minutes} min · ≈ {fcfa(recette.cout.totalFcfa)} · pour{" "}
            {recette.servings}
          </span>
          {incompatible && (
            <span className="mt-1 block text-sm font-bold text-carmin">
              Ne convient pas :{" "}
              {recette.incompatibilites.map((i) => `${i.raison} (${i.membre})`).join(", ")}
            </span>
          )}
        </span>
        <ArrowRight size={20} strokeWidth={2.8} />
      </Link>
    </li>
  );
}

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<Parametres>;
}) {
  const session = await exigerSession().catch((erreur: unknown) => {
    if (erreur instanceof ErreurApi) return null;
    throw erreur;
  });
  if (!session) redirect("/connexion");

  const filtres = lireFiltres(await searchParams);
  const { recettes, masquees } = await listerCatalogue(session, filtres);
  const filtreActif = Boolean(filtres.q || filtres.cuisine || filtres.temps || filtres.cout);

  return (
    <>
      <PageHeader
        overline="Le catalogue"
        title="Recettes"
        right={<UrgencyButton variant="square" />}
      />

      <form action="/recettes" method="get" role="search" className="mt-4 flex gap-2">
        {filtres.cuisine && <input type="hidden" name="cuisine" value={filtres.cuisine} />}
        {filtres.temps && <input type="hidden" name="temps" value={filtres.temps} />}
        {filtres.cout && <input type="hidden" name="cout" value={filtres.cout} />}
        {filtres.tout && <input type="hidden" name="tout" value="1" />}
        <label htmlFor="recherche" className="sr-only">
          Chercher une recette
        </label>
        <input
          id="recherche"
          name="q"
          type="search"
          defaultValue={filtres.q}
          placeholder="Attiéké, poulet, lentilles…"
          className="h-12 min-w-0 flex-1 rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-creme px-4 text-base font-bold text-foret placeholder:text-cacao/50"
        />
        <button
          type="submit"
          className="press h-12 shrink-0 rounded-[16px_12px_18px_14px] bg-foret px-4 font-extrabold text-or"
        >
          Chercher
        </button>
      </form>

      <LigneDeFiltres
        titre="Origine"
        choix={[
          {
            libelle: "Toutes",
            href: lien(filtres, { cuisine: undefined }),
            actif: !filtres.cuisine,
          },
          ...CUISINES.map((c) => ({
            libelle: c.libelle,
            href: lien(filtres, { cuisine: c.valeur }),
            actif: filtres.cuisine === c.valeur,
          })),
        ]}
      />
      <LigneDeFiltres
        titre="Temps"
        choix={[
          { libelle: "Tout", href: lien(filtres, { temps: undefined }), actif: !filtres.temps },
          ...TEMPS.map((t) => ({
            libelle: t < 60 ? `≤ ${t} min` : `≤ ${t / 60} h${t % 60 ? ` ${t % 60}` : ""}`,
            href: lien(filtres, { temps: String(t) }),
            actif: filtres.temps === t,
          })),
        ]}
      />
      <LigneDeFiltres
        titre="Coût de la recette"
        choix={[
          { libelle: "Tout", href: lien(filtres, { cout: undefined }), actif: !filtres.cout },
          ...COUTS.map((c) => ({
            libelle: `≤ ${fcfa(c)}`,
            href: lien(filtres, { cout: String(c) }),
            actif: filtres.cout === c,
          })),
        ]}
      />

      {(masquees > 0 || filtres.tout) && (
        <Link
          href={lien(filtres, { tout: filtres.tout ? undefined : "1" })}
          className="mt-4 flex min-h-11 items-center text-sm font-extrabold text-carmin underline"
        >
          {filtres.tout
            ? "Masquer les recettes qui ne conviennent pas au foyer"
            : `Afficher aussi ${masquees} recette${masquees > 1 ? "s" : ""} qui ne convien${masquees > 1 ? "nent" : "t"} pas au foyer`}
        </Link>
      )}

      {recettes.length > 0 ? (
        <>
          <p className="mt-4 text-sm font-bold text-cacao" aria-live="polite">
            {recettes.length} recette{recettes.length > 1 ? "s" : ""}
          </p>
          <ul className="mt-2 flex flex-col gap-3">
            {recettes.map((recette) => (
              <CarteRecette key={recette.id} recette={recette} />
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-6 text-center">
          <p className="font-semibold text-cacao">
            {filtreActif
              ? "Aucune recette ne correspond à ta recherche."
              : "Aucune recette disponible pour l'instant : elles sont en cours de vérification."}
          </p>
          {filtreActif && (
            <Link
              href="/recettes"
              className="press mt-3 inline-flex h-11 items-center rounded-[14px_18px_16px_12px] border-[2.5px] border-foret px-4 font-extrabold text-foret"
            >
              Effacer les filtres
            </Link>
          )}
        </div>
      )}
    </>
  );
}
