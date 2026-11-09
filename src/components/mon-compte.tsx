"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signOut } from "next-auth/react";
import { BoutonEnvoi, ChampFormulaire, MessageErreur } from "@/components/champ-formulaire";
import type { CorpsErreur } from "@/lib/erreurs";
import { changementMotDePasseSchema, type ChangementMotDePasse } from "@/lib/validation/compte";

const CHAMPS = ["currentPassword", "newPassword"] as const;

/**
 * Bloc « Mon compte » : changer son mot de passe et se déconnecter (EF-01).
 * Le formulaire du mot de passe reste replié tant qu'on ne le demande pas, pour garder la page courte.
 */
export function MonCompte() {
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangementMotDePasse>({ resolver: zodResolver(changementMotDePasseSchema) });

  async function envoyer(donnees: ChangementMotDePasse) {
    setErreur(null);
    setSucces(false);
    let reponse: Response;
    try {
      reponse = await fetch("/api/account/password", {
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
      const champs = corps?.error.champs ?? {};
      for (const champ of CHAMPS) {
        if (champs[champ]) setError(champ, { message: champs[champ] });
      }
      if (!CHAMPS.some((champ) => champs[champ])) {
        setErreur(corps?.error.message ?? "Un problème est survenu. Réessaie plus tard.");
      }
      return;
    }

    reset();
    setOuvert(false);
    setSucces(true);
  }

  function fermer() {
    reset();
    setErreur(null);
    setOuvert(false);
  }

  return (
    <section className="paper-shadow mt-6 rounded-[20px_16px_22px_18px] border-[2.5px] border-foret bg-creme p-5">
      <h2 className="font-display text-xl font-semibold text-foret">Mon compte</h2>

      {succes && (
        <p role="status" className="mt-3 text-sm font-bold text-palme">
          Ton mot de passe a bien été changé.
        </p>
      )}

      {ouvert ? (
        <form onSubmit={handleSubmit(envoyer)} noValidate className="mt-4 flex flex-col gap-4">
          <ChampFormulaire
            label="Mot de passe actuel"
            type="password"
            autoComplete="current-password"
            autoFocus
            erreur={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
          <ChampFormulaire
            label="Nouveau mot de passe (8 caractères minimum)"
            type="password"
            autoComplete="new-password"
            erreur={errors.newPassword?.message}
            {...register("newPassword")}
          />
          {erreur && <MessageErreur>{erreur}</MessageErreur>}
          <BoutonEnvoi enCours={isSubmitting}>Changer le mot de passe</BoutonEnvoi>
          <button
            type="button"
            onClick={fermer}
            className="press -mt-2 h-11 w-full font-extrabold text-cacao"
          >
            Annuler
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setSucces(false);
            setOuvert(true);
          }}
          className="press mt-4 h-12 w-full rounded-[16px_12px_18px_14px] border-[2.5px] border-foret font-extrabold text-foret"
        >
          Changer mon mot de passe
        </button>
      )}

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/connexion" })}
        className="press mt-4 h-12 w-full rounded-[16px_12px_18px_14px] border-[2.5px] border-carmin font-extrabold text-carmin"
      >
        Se déconnecter
      </button>

      <SupprimerCompte />
    </section>
  );
}

function SupprimerCompte() {
  const [ouvert, setOuvert] = useState(false);
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function supprimer(e: React.FormEvent) {
    e.preventDefault();
    if (!motDePasse.trim() || enCours) return;
    setErreur(null);
    setEnCours(true);

    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: motDePasse }),
      });

      if (!res.ok) {
        const corps = (await res.json().catch(() => null)) as CorpsErreur | null;
        setErreur(
          corps?.error.champs?.password ?? corps?.error.message ?? "Un problème est survenu.",
        );
        return;
      }

      await signOut({ callbackUrl: "/connexion" });
    } catch {
      setErreur("Pas de connexion internet. Réessaie dans un instant.");
    } finally {
      setEnCours(false);
    }
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="mt-6 w-full text-center text-sm font-bold text-cacao/60 underline underline-offset-4"
      >
        Supprimer mon compte
      </button>
    );
  }

  return (
    <div className="mt-6 rounded-[14px_18px_16px_12px] border-2 border-dashed border-carmin/40 bg-carmin/5 p-4">
      <p className="text-sm font-bold text-carmin">
        Cette action est irréversible. Toutes tes données seront supprimées.
      </p>
      <form onSubmit={supprimer} className="mt-3 flex flex-col gap-3">
        <ChampFormulaire
          label="Confirme ton mot de passe"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={motDePasse}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMotDePasse(e.target.value)}
        />
        {erreur && <MessageErreur>{erreur}</MessageErreur>}
        <BoutonEnvoi enCours={enCours} variante="danger">
          Supprimer définitivement
        </BoutonEnvoi>
        <button
          type="button"
          onClick={() => {
            setOuvert(false);
            setMotDePasse("");
            setErreur(null);
          }}
          className="press -mt-1 h-11 w-full font-extrabold text-cacao"
        >
          Annuler
        </button>
      </form>
    </div>
  );
}
