"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { BoutonEnvoi, ChampFormulaire, MessageErreur } from "@/components/champ-formulaire";
import { HandNote } from "@/components/main-levee";
import { connexionSchema, type Connexion } from "@/lib/validation/compte";

const MESSAGES: Record<string, string> = {
  TROPDEREQUETES: "Trop de tentatives. Réessaie dans 15 minutes.",
};

export default function ConnexionPage() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Connexion>({ resolver: zodResolver(connexionSchema) });

  async function envoyer(donnees: Connexion) {
    setErreur(null);
    const resultat = await signIn("credentials", { ...donnees, redirect: false });
    if (resultat?.error) {
      setErreur(MESSAGES[resultat.code ?? ""] ?? "Email ou mot de passe incorrect.");
      return;
    }
    router.push("/accueil");
    router.refresh();
  }

  return (
    <>
      <h1 className="retro mt-10 text-4xl leading-[1.2]">Bon retour&nbsp;!</h1>
      <HandNote className="mt-2 text-xl text-carmin">on reprend où on en était</HandNote>

      <form onSubmit={handleSubmit(envoyer)} noValidate className="mt-8 flex flex-col gap-4">
        <ChampFormulaire
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          erreur={errors.email?.message}
          {...register("email")}
        />
        <ChampFormulaire
          label="Mot de passe"
          type="password"
          autoComplete="current-password"
          erreur={errors.password?.message}
          {...register("password")}
        />
        {erreur && <MessageErreur>{erreur}</MessageErreur>}
        <div className="mt-4">
          <BoutonEnvoi enCours={isSubmitting}>Se connecter</BoutonEnvoi>
        </div>
      </form>

      <p className="mt-6 text-center text-[15px] font-bold text-puce">
        Pas encore de compte&nbsp;?{" "}
        <Link href="/inscription" className="inline-block py-3 font-extrabold underline">
          Créer un compte
        </Link>
      </p>
    </>
  );
}
