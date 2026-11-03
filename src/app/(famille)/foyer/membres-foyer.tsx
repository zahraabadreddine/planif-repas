"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageErreur } from "@/components/champ-formulaire";
import type { MembreFoyer } from "@/lib/foyer/membres";
import { ALLERGENES, REGIMES, TRANCHES } from "@/lib/validation/membre";
import { FormulaireMembre } from "./formulaire-membre";

const cadre =
  "paper-shadow mt-6 rounded-[20px_16px_22px_18px] border-[2.5px] border-foret bg-creme p-5";
const boutonSecondaire =
  "press h-11 shrink-0 rounded-[14px_18px_16px_12px] border-[2.5px] px-3.5 text-sm font-extrabold";

function descriptionAge(membre: MembreFoyer) {
  const tranche = TRANCHES.find((t) => t.valeur === membre.ageGroup)!.libelle;
  if (membre.age === null) return tranche;
  return `${membre.age} an${membre.age > 1 ? "s" : ""} · ${tranche.toLowerCase()}`;
}

function libellesAllergies(membre: MembreFoyer) {
  return [
    ...ALLERGENES.filter((a) => membre.allergies.includes(a.valeur)).map((a) => a.libelle),
    ...membre.autresAllergies,
  ];
}

function libellesRegimes(membre: MembreFoyer) {
  return REGIMES.filter((r) => membre.regimes.includes(r.valeur)).map((r) => r.libelle);
}

type Props = {
  membres: MembreFoyer[];
  aUnFoyer: boolean;
  lectureSeule?: boolean;
  consentSante: boolean;
  ingredients: string[];
};

/** Membres du foyer : liste, ajout, modification et retrait (EF-03). */
export function MembresFoyer({
  membres: membresInitiaux,
  aUnFoyer,
  lectureSeule = false,
  consentSante,
  ingredients,
}: Props) {
  const router = useRouter();
  const [membres, setMembres] = useState(membresInitiaux);
  const [consentement, setConsentement] = useState(consentSante);
  // null : liste seule ; "nouveau" : ajout ; sinon identifiant du membre modifié
  const [edition, setEdition] = useState<string | null>(null);
  const [aRetirer, setARetirer] = useState<string | null>(null);
  const [retraitEnCours, setRetraitEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function ouvrir(cible: string) {
    setErreur(null);
    setMessage(null);
    setARetirer(null);
    setEdition(cible);
  }

  function enregistre(membre: MembreFoyer) {
    const existe = membres.some((m) => m.id === membre.id);
    setMembres(
      existe ? membres.map((m) => (m.id === membre.id ? membre : m)) : [...membres, membre],
    );
    setMessage(
      existe ? `${membre.label} a bien été modifié.` : `${membre.label} fait partie du foyer.`,
    );
    setEdition(null);
    router.refresh();
  }

  async function retirer(membre: MembreFoyer) {
    setRetraitEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch(`/api/household/members/${membre.id}`, { method: "DELETE" });
      if (!reponse.ok) throw new Error();
      setMembres(membres.filter((m) => m.id !== membre.id));
      setMessage(`${membre.label} a été retiré du foyer.`);
      setARetirer(null);
      router.refresh();
    } catch {
      setErreur("Le retrait n'a pas fonctionné. Réessaie dans un instant.");
    } finally {
      setRetraitEnCours(false);
    }
  }

  const formulaire = (membre: MembreFoyer | null) => (
    <FormulaireMembre
      membre={membre}
      consentSante={consentement}
      ingredients={ingredients}
      onConsentement={() => setConsentement(true)}
      onEnregistre={enregistre}
      onAnnuler={() => setEdition(null)}
    />
  );

  return (
    <section className={cadre}>
      <h2 className="font-display text-xl font-semibold text-foret">
        Membres du foyer{membres.length > 0 && ` (${membres.length})`}
      </h2>

      {!aUnFoyer ? (
        <p className="mt-2 text-sm font-semibold text-cacao">
          Décris d&apos;abord ton foyer, puis ajoute les personnes qui mangent à la maison.
        </p>
      ) : (
        <>
          {membres.length === 0 && edition !== "nouveau" && (
            <p className="mt-2 text-sm font-semibold text-cacao">
              {lectureSeule
                ? "Aucun membre n'est encore décrit dans ce foyer."
                : "Ajoute les personnes qui mangent à la maison : Umami adaptera les portions et écartera les plats qui ne leur conviennent pas."}
            </p>
          )}

          <ul className="mt-3 flex flex-col gap-3">
            {membres.map((membre) => {
              if (edition === membre.id) {
                return (
                  <li
                    key={membre.id}
                    className="rounded-[16px_12px_18px_14px] border-[2.5px] border-palme p-4"
                  >
                    <h3 className="mb-3 font-display text-lg font-semibold text-foret">
                      Modifier {membre.label}
                    </h3>
                    {formulaire(membre)}
                  </li>
                );
              }
              const allergies = libellesAllergies(membre);
              const regimes = libellesRegimes(membre);
              return (
                <li key={membre.id} className="rounded-[16px_12px_18px_14px] bg-sable/60 p-3.5">
                  <p className="font-extrabold text-foret">{membre.label}</p>
                  <p className="text-sm font-bold text-cacao">{descriptionAge(membre)}</p>
                  {allergies.length > 0 && (
                    <p className="mt-1 text-sm font-bold text-carmin">
                      Allergie{allergies.length > 1 ? "s" : ""} : {allergies.join(", ")}
                    </p>
                  )}
                  {regimes.length > 0 && (
                    <p className="mt-1 text-sm font-bold text-palme">
                      Régime : {regimes.join(", ")}
                    </p>
                  )}

                  {aRetirer === membre.id ? (
                    <div role="alertdialog" aria-label={`Retirer ${membre.label}`} className="mt-3">
                      <p className="text-sm font-bold text-foret">
                        Retirer {membre.label} du foyer ? Ses allergies et son régime seront aussi
                        effacés.
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => retirer(membre)}
                          disabled={retraitEnCours}
                          className={`${boutonSecondaire} flex-1 border-carmin bg-carmin text-creme disabled:opacity-60`}
                        >
                          {retraitEnCours ? "Un instant…" : "Oui, retirer"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setARetirer(null)}
                          className={`${boutonSecondaire} flex-1 border-foret text-foret`}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    !lectureSeule &&
                    edition === null && (
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => ouvrir(membre.id)}
                          className={`${boutonSecondaire} border-foret text-foret`}
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMessage(null);
                            setARetirer(membre.id);
                          }}
                          className={`${boutonSecondaire} border-carmin text-carmin`}
                        >
                          Retirer
                        </button>
                      </div>
                    )
                  )}
                </li>
              );
            })}
          </ul>

          {erreur && (
            <div className="mt-3">
              <MessageErreur>{erreur}</MessageErreur>
            </div>
          )}
          {message && (
            <p role="status" className="mt-3 text-sm font-bold text-palme">
              {message}
            </p>
          )}

          {edition === "nouveau" ? (
            <div className="mt-4 rounded-[16px_12px_18px_14px] border-[2.5px] border-palme p-4">
              <h3 className="mb-3 font-display text-lg font-semibold text-foret">Nouveau membre</h3>
              {formulaire(null)}
            </div>
          ) : (
            !lectureSeule &&
            edition === null && (
              <button
                type="button"
                onClick={() => ouvrir("nouveau")}
                className="press mt-4 h-12 w-full rounded-[16px_12px_18px_14px] border-[2.5px] border-dashed border-foret font-extrabold text-foret"
              >
                + Ajouter un membre
              </button>
            )
          )}
        </>
      )}
    </section>
  );
}
