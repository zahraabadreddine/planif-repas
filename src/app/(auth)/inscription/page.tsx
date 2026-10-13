"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { BoutonEnvoi, ChampFormulaire, MessageErreur } from "@/components/champ-formulaire";
import { HandNote } from "@/components/main-levee";
import type { CorpsErreur } from "@/lib/erreurs";
import {
  formulaireInscriptionSchema,
  type FormulaireInscription,
  type Inscription,
} from "@/lib/validation/compte";

const CHAMPS = ["fullName", "email", "password"] as const;

function CaseConsentement({
  titre,
  detail,
  enregistrement,
}: {
  titre: string;
  detail: string;
  enregistrement: UseFormRegisterReturn;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[16px_12px_18px_14px] border-[2.5px] border-foret bg-sable/40 p-3.5">
      <input type="checkbox" className="mt-0.5 size-6 shrink-0 accent-palme" {...enregistrement} />
      <span>
        <span className="block text-[15px] font-extrabold text-foret">{titre}</span>
        <span className="block text-sm font-semibold text-cacao">{detail}</span>
      </span>
    </label>
  );
}

export default function InscriptionPage() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormulaireInscription>({
    resolver: zodResolver(formulaireInscriptionSchema),
    defaultValues: { consentHealth: false, consentLocation: false },
  });

  async function envoyer(formulaire: FormulaireInscription) {
    setErreur(null);
    // La confirmation ne sert qu'au formulaire : elle n'est pas envoyée au serveur.
    const donnees: Inscription = {
      fullName: formulaire.fullName,
      email: formulaire.email,
      password: formulaire.password,
      consentHealth: formulaire.consentHealth,
      consentLocation: formulaire.consentLocation,
    };
    let reponse: Response;
    try {
      reponse = await fetch("/api/register", {
        method: "POST",
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
      if (corps?.error.code === "EMAILDEJAPRIS") {
        setError("email", { message: corps.error.message });
      } else if (!CHAMPS.some((champ) => champs[champ])) {
        setErreur(corps?.error.message ?? "Un problème est survenu. Réessaie plus tard.");
      }
      return;
    }

    const connexion = await signIn("credentials", {
      email: donnees.email,
      password: donnees.password,
      redirect: false,
    });
    if (connexion?.error) {
      router.push("/connexion");
      return;
    }
    router.push("/accueil");
    router.refresh();
  }

  return (
    <>
      <h1 className="retro mt-8 text-4xl leading-[1.2]">Bienvenue&nbsp;!</h1>
      <HandNote className="mt-2 text-xl text-carmin">Tantie t&apos;attend en cuisine</HandNote>

      <form onSubmit={handleSubmit(envoyer)} noValidate className="mt-7 flex flex-col gap-4">
        <ChampFormulaire
          label="Ton prénom et ton nom"
          autoComplete="name"
          erreur={errors.fullName?.message}
          {...register("fullName")}
        />
        <ChampFormulaire
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          erreur={errors.email?.message}
          {...register("email")}
        />
        <ChampFormulaire
          label="Mot de passe (8 caractères minimum)"
          type="password"
          autoComplete="new-password"
          erreur={errors.password?.message}
          {...register("password")}
        />
        <ChampFormulaire
          label="Confirme le mot de passe"
          type="password"
          autoComplete="new-password"
          erreur={errors.confirmation?.message}
          {...register("confirmation")}
        />

        <fieldset className="mt-2 flex flex-col gap-3">
          <legend className="mb-1 font-hand text-xl text-puce">
            Tu peux refuser, ça reste utile :
          </legend>
          <CaseConsentement
            titre="J'accepte de partager les allergies et régimes"
            detail="Pour que Tantie ne propose jamais un plat dangereux. Ce n'est pas un avis médical."
            enregistrement={register("consentHealth")}
          />
          <CaseConsentement
            titre="J'accepte de donner mon quartier"
            detail="Pour trouver les marchés et boutiques près de chez toi. Ta position n'est jamais enregistrée."
            enregistrement={register("consentLocation")}
          />
        </fieldset>

        {erreur && <MessageErreur>{erreur}</MessageErreur>}
        <div className="mt-4">
          <BoutonEnvoi enCours={isSubmitting}>Créer mon compte</BoutonEnvoi>
        </div>
      </form>

      <p className="mt-6 text-center text-[15px] font-bold text-puce">
        Déjà un compte&nbsp;?{" "}
        <Link href="/connexion" className="inline-block py-3 font-extrabold underline">
          Se connecter
        </Link>
      </p>
    </>
  );
}
