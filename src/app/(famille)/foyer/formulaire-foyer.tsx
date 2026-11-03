"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BoutonEnvoi, ChampFormulaire, MessageErreur } from "@/components/champ-formulaire";
import type { CorpsErreur } from "@/lib/erreurs";
import type { ProfilFoyer } from "@/lib/foyer/profil";
import { cx } from "@/lib/format";
import {
  CUISINES,
  JOURS,
  NOMPARDEFAUT,
  foyerSchema,
  lireMontantFcfa,
  valeursDuFoyer,
  type Foyer,
} from "@/lib/validation/foyer";

const CHAMPS = ["name", "weeklyBudgetFcfa", "cuisinesPreferred", "shoppingDay"] as const;
type Champ = (typeof CHAMPS)[number];

const estChamp = (cle: string): cle is Champ => (CHAMPS as readonly string[]).includes(cle);

// Pastille à cocher : la case native reste dans la page (accessible), seul le libellé est visible.
const pastille = (cochee: boolean) =>
  cx(
    "flex h-11 items-center justify-center rounded-full border-[2.5px] border-foret px-4 text-[15px] font-bold",
    "peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sirop",
    cochee ? "bg-palme text-creme" : "bg-creme text-foret",
  );

type Props = {
  foyer: Foyer | null;
  onEnregistre: (foyer: ProfilFoyer) => void;
  onAnnuler?: () => void;
};

/** Formulaire du foyer : nom, budget, cuisines et jour des courses (EF-03). */
export function FormulaireFoyer({ foyer, onEnregistre, onAnnuler }: Props) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Foyer>({
    resolver: zodResolver(foyerSchema),
    // Sans l'identifiant du foyer : le schéma refuse tout champ en trop.
    defaultValues: foyer
      ? valeursDuFoyer(foyer)
      : { name: NOMPARDEFAUT, cuisinesPreferred: [], shoppingDay: null },
  });

  async function envoyer(donnees: Foyer) {
    setErreur(null);
    let reponse: Response;
    try {
      reponse = await fetch("/api/household", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(donnees),
      });
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
        }
      }
      if (!erreurDeChamp) {
        setErreur(corps?.error.message ?? "Un problème est survenu. Réessaie plus tard.");
      }
      return;
    }

    const { household } = (await reponse.json()) as { household: ProfilFoyer };
    // Rafraîchit aussi les autres écrans : la carte de l'accueil disparaît.
    router.refresh();
    onEnregistre(household);
  }

  return (
    <form onSubmit={handleSubmit(envoyer)} noValidate className="mt-4 flex flex-col gap-5">
      <ChampFormulaire
        label="Nom du foyer"
        autoComplete="off"
        erreur={errors.name?.message}
        {...register("name")}
      />

      <div>
        <ChampFormulaire
          label="Budget de la semaine (FCFA)"
          inputMode="numeric"
          placeholder="Par exemple 25 000"
          autoComplete="off"
          erreur={errors.weeklyBudgetFcfa?.message}
          {...register("weeklyBudgetFcfa", { setValueAs: lireMontantFcfa })}
        />
        <p className="mt-1 text-sm font-semibold text-cacao">
          Ce que ta famille veut dépenser pour les repas de la semaine.
        </p>
      </div>

      <Controller
        name="cuisinesPreferred"
        control={control}
        render={({ field }) => (
          <fieldset>
            <legend className="text-[15px] font-extrabold text-foret">Cuisines préférées</legend>
            <p className="mt-0.5 text-sm font-semibold text-cacao">
              Coche celles que ta famille aime. Tu peux n&apos;en choisir aucune.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CUISINES.map((cuisine) => {
                const cochee = field.value.includes(cuisine.valeur);
                return (
                  <label key={cuisine.valeur} className="cursor-pointer">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={cochee}
                      onChange={() =>
                        field.onChange(
                          cochee
                            ? field.value.filter((valeur) => valeur !== cuisine.valeur)
                            : [...field.value, cuisine.valeur],
                        )
                      }
                    />
                    <span className={pastille(cochee)}>
                      {cochee && <span aria-hidden="true">✓&nbsp;</span>}
                      {cuisine.libelle}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.cuisinesPreferred?.message && (
              <p role="alert" className="mt-1.5 text-sm font-bold text-carmin">
                {errors.cuisinesPreferred.message}
              </p>
            )}
          </fieldset>
        )}
      />

      <Controller
        name="shoppingDay"
        control={control}
        render={({ field }) => (
          <fieldset>
            <legend className="text-[15px] font-extrabold text-foret">Jour des courses</legend>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[{ valeur: null, libelle: "Pas de jour fixe", court: "Aucun" }, ...JOURS].map(
                (jour) => {
                  const choisi = field.value === jour.valeur;
                  return (
                    <label key={jour.libelle} className="cursor-pointer">
                      <input
                        type="radio"
                        name={field.name}
                        className="peer sr-only"
                        checked={choisi}
                        onChange={() => field.onChange(jour.valeur)}
                        aria-label={jour.libelle}
                      />
                      <span className={pastille(choisi)}>{jour.court}</span>
                    </label>
                  );
                },
              )}
            </div>
            {errors.shoppingDay?.message && (
              <p role="alert" className="mt-1.5 text-sm font-bold text-carmin">
                {errors.shoppingDay.message}
              </p>
            )}
          </fieldset>
        )}
      />

      {erreur && <MessageErreur>{erreur}</MessageErreur>}
      <BoutonEnvoi enCours={isSubmitting}>{foyer ? "Enregistrer" : "Créer mon foyer"}</BoutonEnvoi>
      {onAnnuler && (
        <button
          type="button"
          onClick={onAnnuler}
          className="press -mt-2 h-11 w-full font-extrabold text-cacao"
        >
          Annuler
        </button>
      )}
    </form>
  );
}
