"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BoutonEnvoi, ChampFormulaire, MessageErreur } from "@/components/champ-formulaire";
import type { CorpsErreur } from "@/lib/erreurs";
import { rejoindreSchema, type Rejoindre } from "@/lib/validation/invitation";

const cadre =
  "paper-shadow mt-6 rounded-[20px_16px_22px_18px] border-[2.5px] border-foret bg-creme p-5";

/** Formulaire « Rejoindre un foyer » : le code reçu sur WhatsApp (EF-03). */
export function RejoindreFoyer({ codeInitial }: { codeInitial: string }) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Rejoindre>({
    resolver: zodResolver(rejoindreSchema),
    defaultValues: { code: codeInitial },
  });

  async function envoyer({ code }: Rejoindre) {
    setErreur(null);
    let reponse: Response;
    try {
      reponse = await fetch("/api/household/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
    } catch {
      setErreur("Pas de connexion internet. Réessaie dans un instant.");
      return;
    }
    if (!reponse.ok) {
      const corps = (await reponse.json().catch(() => null)) as CorpsErreur | null;
      if (corps?.error.code === "CODEINVALIDE") {
        setError("code", { message: corps.error.message });
      } else {
        setErreur(corps?.error.message ?? "Un problème est survenu. Réessaie plus tard.");
      }
      return;
    }
    router.push("/foyer");
    router.refresh();
  }

  return (
    <section className={cadre}>
      <p className="text-sm font-semibold text-cacao">
        Tape le code à 6 caractères envoyé par la personne qui t&apos;invite. Vous verrez le même
        foyer, le même menu et la même liste de courses.
      </p>
      <form onSubmit={handleSubmit(envoyer)} noValidate className="mt-4 flex flex-col gap-4">
        <ChampFormulaire
          label="Code d'invitation"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="K7M 4PQ"
          maxLength={10}
          className="text-center font-display text-2xl uppercase tracking-[0.2em]"
          erreur={errors.code?.message}
          {...register("code")}
        />
        <p className="rounded-[16px_12px_18px_14px] bg-or/50 px-4 py-3 text-sm font-bold text-foret">
          En rejoignant ce foyer, tu verras ses membres, avec leurs allergies et leurs régimes.
        </p>
        {erreur && <MessageErreur>{erreur}</MessageErreur>}
        <BoutonEnvoi enCours={isSubmitting}>Rejoindre le foyer</BoutonEnvoi>
      </form>
    </section>
  );
}
