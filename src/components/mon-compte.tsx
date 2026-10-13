"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signOut } from "next-auth/react";
import { BoutonEnvoi, ChampFormulaire, MessageErreur } from "@/components/champ-formulaire";
import type { CorpsErreur } from "@/lib/erreurs";
import { changementMotDePasseSchema, type ChangementMotDePasse } from "@/lib/validation/compte";

const CHAMPS = ["currentPassword", "newPassword"] as const;

/** Bloc « Mon compte » : changer son mot de passe et se déconnecter (EF-01). */
export function MonCompte() {
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
    setSucces(true);
  }

  return (
    <section className="paper-shadow mt-6 rounded-[20px_16px_22px_18px] border-[2.5px] border-foret bg-creme p-5">
      <h2 className="font-display text-xl font-semibold text-foret">Mon compte</h2>

      <form onSubmit={handleSubmit(envoyer)} noValidate className="mt-4 flex flex-col gap-4">
        <ChampFormulaire
          label="Mot de passe actuel"
          type="password"
          autoComplete="current-password"
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
        {succes && (
          <p role="status" className="text-sm font-bold text-palme">
            Ton mot de passe a bien été changé.
          </p>
        )}
        <BoutonEnvoi enCours={isSubmitting}>Changer le mot de passe</BoutonEnvoi>
      </form>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/connexion" })}
        className="press mt-4 h-12 w-full rounded-[16px_12px_18px_14px] border-[2.5px] border-carmin font-extrabold text-carmin"
      >
        Se déconnecter
      </button>
    </section>
  );
}
