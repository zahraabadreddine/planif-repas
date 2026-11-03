"use client";

import { useId, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BoutonEnvoi, ChampFormulaire, MessageErreur } from "@/components/champ-formulaire";
import type { CorpsErreur } from "@/lib/erreurs";
import { ageEnAnnees, dateDuJour, trancheDAge } from "@/lib/foyer/age";
import type { MembreFoyer } from "@/lib/foyer/membres";
import { cx } from "@/lib/format";
import {
  ALLERGENES,
  REGIMES,
  TRANCHES,
  membreSchema,
  normaliser,
  reconnaitreAllergene,
  type Allergene,
  type Membre,
} from "@/lib/validation/membre";

// Formulaire en 3 courtes étapes : qui est-ce, y a-t-il des allergies, lesquelles.
type Etape = "identite" | "question" | "sante";
const NUMEROS: Record<Etape, number> = { identite: 1, question: 2, sante: 3 };

const CHAMPSIDENTITE = ["label", "birthDate", "ageGroup"] as const;
const CHAMPS = [...CHAMPSIDENTITE, "allergies", "autresAllergies", "regimes"] as const;
type Champ = (typeof CHAMPS)[number];
const estChamp = (cle: string): cle is Champ => (CHAMPS as readonly string[]).includes(cle);

/** Les 6 allergies les plus fréquentes, affichées d'emblée ; les 8 autres sur demande. */
const COURANTES: Allergene[] = ["arachide", "lait", "oeuf", "poisson", "crustaces", "gluten"];

const pastille = (active: boolean) =>
  cx(
    "flex min-h-11 items-center justify-center rounded-full border-[2.5px] border-foret px-3.5 text-[15px] font-bold",
    "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sirop",
    active ? "bg-palme text-creme" : "bg-creme text-foret",
  );

const titre = "text-[15px] font-extrabold text-foret";
const aide = "mt-0.5 text-sm font-semibold text-cacao";
const boutonPrincipal =
  "press flex h-[58px] w-full items-center justify-center rounded-[18px_22px_20px_16px] bg-foret font-display text-xl font-semibold text-or shadow-[0_6px_0_#411102] disabled:opacity-60";
const boutonSecondaire =
  "press h-[58px] w-full rounded-[18px_22px_20px_16px] border-[2.5px] border-foret font-display text-xl font-semibold text-foret disabled:opacity-60";
const lienRetour = "press -mt-2 h-11 w-full font-extrabold text-cacao";

/** Valeurs du formulaire : uniquement les champs du schéma (pas l'identifiant ni l'âge). */
function valeursInitiales(membre: MembreFoyer | null): Membre {
  if (!membre) {
    return {
      label: "",
      birthDate: null,
      ageGroup: null,
      allergies: [],
      autresAllergies: [],
      regimes: [],
    };
  }
  const { label, birthDate, ageGroup, allergies, autresAllergies, regimes } = membre;
  return { label, birthDate, ageGroup, allergies, autresAllergies, regimes };
}

/** Âge déduit de la date tapée, ou null si elle est vide ou invalide. */
function ageDeLaDate(date: string | null): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const aujourdhui = dateDuJour();
  if (date > aujourdhui) return null;
  return ageEnAnnees(date, aujourdhui);
}

type Props = {
  membre: MembreFoyer | null;
  consentSante: boolean;
  ingredients: string[];
  onConsentement: () => void;
  onEnregistre: (membre: MembreFoyer) => void;
  onAnnuler: () => void;
};

/** Formulaire d'un membre du foyer (EF-03). */
export function FormulaireMembre({
  membre,
  consentSante,
  ingredients,
  onConsentement,
  onEnregistre,
  onAnnuler,
}: Props) {
  const id = useId();
  const [etape, setEtape] = useState<Etape>("identite");
  const [erreur, setErreur] = useState<string | null>(null);
  const [tousAllergenes, setTousAllergenes] = useState(false);
  const [saisieAutre, setSaisieAutre] = useState("");
  const [infoAutre, setInfoAutre] = useState<string | null>(null);
  const [demandeConsentement, setDemandeConsentement] = useState(false);
  const [envoiConsentement, setEnvoiConsentement] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<Membre>({
    resolver: zodResolver(membreSchema),
    defaultValues: valeursInitiales(membre),
  });

  const surnom = useWatch({ control, name: "label" });
  const age = ageDeLaDate(useWatch({ control, name: "birthDate" }));
  const allergies = useWatch({ control, name: "allergies" });
  const autresAllergies = useWatch({ control, name: "autresAllergies" });

  const aDejaDesRestrictions =
    membre !== null &&
    membre.allergies.length + membre.autresAllergies.length + membre.regimes.length > 0;

  async function suivant() {
    if (!(await trigger(CHAMPSIDENTITE))) return;
    setErreur(null);
    setEtape(aDejaDesRestrictions ? "sante" : "question");
  }

  function repondreOui() {
    if (consentSante) setEtape("sante");
    else setDemandeConsentement(true);
  }

  /** Les allergies sont des données de santé : consentement demandé une fois (CLAUDE.md §13). */
  async function accepterConsentement() {
    setEnvoiConsentement(true);
    setErreur(null);
    try {
      const reponse = await fetch("/api/account/consent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ health: true }),
      });
      if (!reponse.ok) throw new Error();
      onConsentement();
      setDemandeConsentement(false);
      setEtape("sante");
    } catch {
      setErreur("Ton accord n'a pas pu être enregistré. Réessaie dans un instant.");
    } finally {
      setEnvoiConsentement(false);
    }
  }

  function ajouterAutreAllergie() {
    const texte = saisieAutre.trim();
    if (texte.length < 2) {
      setInfoAutre("Écris au moins 2 lettres.");
      return;
    }
    const allergene = reconnaitreAllergene(texte);
    if (allergene) {
      if (!allergies.includes(allergene)) setValue("allergies", [...allergies, allergene]);
      if (!COURANTES.includes(allergene)) setTousAllergenes(true);
      const libelle = ALLERGENES.find((a) => a.valeur === allergene)!.libelle;
      setInfoAutre(`« ${texte} » correspond à « ${libelle} » : la case est cochée.`);
      setSaisieAutre("");
      return;
    }
    const ingredient = ingredients.find((nom) => normaliser(nom) === normaliser(texte));
    const valeur = ingredient ?? texte;
    if (autresAllergies.some((a) => normaliser(a) === normaliser(valeur))) {
      setInfoAutre("Cette allergie est déjà dans la liste.");
      return;
    }
    setValue("autresAllergies", [...autresAllergies, valeur], { shouldValidate: true });
    setInfoAutre(
      ingredient
        ? `Aucune recette avec « ${ingredient} » ne sera proposée.`
        : `Aucune recette d'Umami ne contient « ${texte} » pour l'instant : on le vérifiera si cet aliment arrive dans le catalogue.`,
    );
    setSaisieAutre("");
  }

  async function envoyer(donnees: Membre) {
    setErreur(null);
    let reponse: Response;
    try {
      reponse = await fetch(
        membre ? `/api/household/members/${membre.id}` : "/api/household/members",
        {
          method: membre ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(donnees),
        },
      );
    } catch {
      setErreur("Pas de connexion internet. Réessaie dans un instant.");
      return;
    }

    if (!reponse.ok) {
      const corps = (await reponse.json().catch(() => null)) as CorpsErreur | null;
      let erreurDeChamp = false;
      for (const [cle, message] of Object.entries(corps?.error.champs ?? {})) {
        const champ = cle.split(".")[0];
        if (estChamp(champ)) {
          setError(champ, { message });
          erreurDeChamp = true;
          if ((CHAMPSIDENTITE as readonly string[]).includes(champ)) setEtape("identite");
        }
      }
      if (!erreurDeChamp) {
        setErreur(corps?.error.message ?? "Un problème est survenu. Réessaie plus tard.");
      }
      return;
    }

    const { member } = (await reponse.json()) as { member: MembreFoyer };
    onEnregistre(member);
  }

  /** « Non » à la question santé : on enregistre aussitôt, sans allergie ni régime. */
  function enregistrerSansSante() {
    setValue("allergies", []);
    setValue("autresAllergies", []);
    setValue("regimes", []);
    void handleSubmit(envoyer)();
  }

  const nom = surnom.trim() || "ce membre";
  const allergenesVisibles = ALLERGENES.filter(
    (a) => tousAllergenes || COURANTES.includes(a.valeur) || allergies.includes(a.valeur),
  );

  return (
    <form onSubmit={handleSubmit(envoyer)} noValidate className="flex flex-col gap-5">
      <p className="text-sm font-bold text-cacao" aria-live="polite">
        Étape {NUMEROS[etape]} sur 3
      </p>

      {etape === "identite" && (
        <>
          <div>
            <ChampFormulaire
              label="Comment l'appelez-vous ?"
              placeholder="Papa, Maman, Awa…"
              autoComplete="off"
              erreur={errors.label?.message}
              {...register("label")}
            />
            <p className={aide}>
              Ce nom reste dans l&apos;app : il n&apos;est jamais envoyé à l&apos;assistant.
            </p>
          </div>

          <div>
            <ChampFormulaire
              label="Date de naissance (facultatif)"
              type="date"
              max={dateDuJour()}
              erreur={errors.birthDate?.message}
              {...register("birthDate", { setValueAs: (v: string) => (v ? v : null) })}
            />
            {age !== null && (
              <p className="mt-1 text-sm font-bold text-palme">
                {age} an{age > 1 ? "s" : ""} ·{" "}
                {TRANCHES.find((t) => t.valeur === trancheDAge(age))?.libelle.toLowerCase()}
              </p>
            )}
          </div>

          {age === null && (
            <Controller
              name="ageGroup"
              control={control}
              render={({ field }) => (
                <fieldset>
                  <legend className={titre}>Pas de date ? Choisis la tranche d&apos;âge</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TRANCHES.map((tranche) => {
                      const choisie = field.value === tranche.valeur;
                      return (
                        <label key={tranche.valeur} className="cursor-pointer">
                          <input
                            type="radio"
                            name={field.name}
                            className="peer sr-only"
                            checked={choisie}
                            onChange={() => field.onChange(tranche.valeur)}
                            aria-label={`${tranche.libelle} (${tranche.detail})`}
                          />
                          <span className={pastille(choisie)}>{tranche.libelle}</span>
                        </label>
                      );
                    })}
                  </div>
                  {errors.ageGroup?.message && (
                    <p role="alert" className="mt-1.5 text-sm font-bold text-carmin">
                      {errors.ageGroup.message}
                    </p>
                  )}
                </fieldset>
              )}
            />
          )}

          {erreur && <MessageErreur>{erreur}</MessageErreur>}
          <button type="button" onClick={suivant} className={boutonPrincipal}>
            Suivant
          </button>
          <button type="button" onClick={onAnnuler} className={lienRetour}>
            Annuler
          </button>
        </>
      )}

      {etape === "question" && (
        <>
          <div>
            <h4 className="font-display text-xl font-semibold text-foret">
              Des allergies ou un régime pour {nom}&nbsp;?
            </h4>
            <p className={aide}>Umami écartera les plats qui ne lui conviennent pas.</p>
          </div>

          {demandeConsentement ? (
            <div
              role="alertdialog"
              aria-labelledby={`${id}-consentement`}
              className="rounded-[16px_12px_18px_14px] border-[2.5px] border-foret bg-or/60 p-4"
            >
              <p id={`${id}-consentement`} className="font-bold text-foret">
                Ces informations concernent la santé de ta famille. Elles servent seulement à
                écarter les plats qui ne conviennent pas. Ce n&apos;est pas un avis médical.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={accepterConsentement}
                  disabled={envoiConsentement}
                  className="press h-11 flex-1 rounded-[14px_18px_16px_12px] bg-foret font-extrabold text-or disabled:opacity-60"
                >
                  {envoiConsentement ? "Un instant…" : "J'accepte"}
                </button>
                <button
                  type="button"
                  onClick={() => setDemandeConsentement(false)}
                  className="press h-11 flex-1 rounded-[14px_18px_16px_12px] border-[2.5px] border-foret font-extrabold text-foret"
                >
                  Non merci
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={enregistrerSansSante}
                disabled={isSubmitting}
                className={boutonPrincipal}
              >
                {isSubmitting ? "Un instant…" : "Non, enregistrer"}
              </button>
              <button type="button" onClick={repondreOui} className={boutonSecondaire}>
                Oui
              </button>
            </div>
          )}

          {erreur && <MessageErreur>{erreur}</MessageErreur>}
          <button type="button" onClick={() => setEtape("identite")} className={lienRetour}>
            Retour
          </button>
        </>
      )}

      {etape === "sante" && (
        <>
          <Controller
            name="allergies"
            control={control}
            render={({ field }) => (
              <fieldset>
                <legend className={titre}>Allergies de {nom}</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {allergenesVisibles.map((allergene) => {
                    const cochee = field.value.includes(allergene.valeur);
                    return (
                      <label key={allergene.valeur} className="cursor-pointer">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={cochee}
                          onChange={() =>
                            field.onChange(
                              cochee
                                ? field.value.filter((v) => v !== allergene.valeur)
                                : [...field.value, allergene.valeur],
                            )
                          }
                        />
                        <span className={pastille(cochee)}>
                          {cochee && <span aria-hidden="true">✓&nbsp;</span>}
                          {allergene.libelle}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {!tousAllergenes && (
                  <button
                    type="button"
                    onClick={() => setTousAllergenes(true)}
                    className="press mt-2 min-h-11 text-sm font-extrabold text-palme underline"
                  >
                    Voir les {ALLERGENES.length - allergenesVisibles.length} autres allergènes
                  </button>
                )}
              </fieldset>
            )}
          />

          <div>
            <label htmlFor={`${id}-autre`} className={titre}>
              Autre allergie
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id={`${id}-autre`}
                list={`${id}-ingredients`}
                value={saisieAutre}
                onChange={(e) => setSaisieAutre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    ajouterAutreAllergie();
                  }
                }}
                placeholder="Tape un aliment"
                autoComplete="off"
                className="h-12 min-w-0 flex-1 rounded-[14px_18px_16px_12px] border-[2.5px] border-foret bg-creme px-4 text-base font-bold text-foret placeholder:text-cacao/50"
              />
              <datalist id={`${id}-ingredients`}>
                {ingredients.map((ingredient) => (
                  <option key={ingredient} value={ingredient} />
                ))}
              </datalist>
              <button
                type="button"
                onClick={ajouterAutreAllergie}
                aria-label="Ajouter cette allergie"
                className="press h-12 w-12 shrink-0 rounded-[16px_12px_18px_14px] bg-palme text-2xl font-extrabold text-creme"
              >
                +
              </button>
            </div>
            {infoAutre && (
              <p role="status" className="mt-1.5 text-sm font-bold text-palme">
                {infoAutre}
              </p>
            )}
            {autresAllergies.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {autresAllergies.map((autre) => (
                  <li key={autre}>
                    <button
                      type="button"
                      onClick={() =>
                        setValue(
                          "autresAllergies",
                          autresAllergies.filter((a) => a !== autre),
                        )
                      }
                      aria-label={`Retirer l'allergie ${autre}`}
                      className={pastille(true)}
                    >
                      {autre}&nbsp;<span aria-hidden="true">×</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {errors.autresAllergies?.message && (
              <p role="alert" className="mt-1.5 text-sm font-bold text-carmin">
                {errors.autresAllergies.message}
              </p>
            )}
          </div>

          <Controller
            name="regimes"
            control={control}
            render={({ field }) => (
              <fieldset>
                <legend className={titre}>Régime</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {REGIMES.map((regime) => {
                    const coche = field.value.includes(regime.valeur);
                    return (
                      <label key={regime.valeur} className="cursor-pointer">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={coche}
                          onChange={() =>
                            field.onChange(
                              coche
                                ? field.value.filter((v) => v !== regime.valeur)
                                : [...field.value, regime.valeur],
                            )
                          }
                        />
                        <span className={pastille(coche)}>
                          {coche && <span aria-hidden="true">✓&nbsp;</span>}
                          {regime.libelle}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}
          />

          {erreur && <MessageErreur>{erreur}</MessageErreur>}
          <BoutonEnvoi enCours={isSubmitting}>Enregistrer</BoutonEnvoi>
          <button
            type="button"
            onClick={() => setEtape(aDejaDesRestrictions ? "identite" : "question")}
            className={lienRetour}
          >
            Retour
          </button>
        </>
      )}
    </form>
  );
}
