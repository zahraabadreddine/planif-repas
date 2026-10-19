"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageErreur } from "@/components/champ-formulaire";
import { WhatsAppIcon } from "@/components/icones";
import type { AccesFoyer } from "@/lib/auth/garde";
import type { CorpsErreur } from "@/lib/erreurs";
import type { InvitationEnAttente, PartageFoyer, PersonneFoyer } from "@/lib/foyer/invitations";
import { cx, whatsappLink } from "@/lib/format";
import { ACCES, afficherCode, texteInvitation, type Acces } from "@/lib/validation/invitation";

const cadre =
  "paper-shadow mt-6 rounded-[20px_16px_22px_18px] border-[2.5px] border-foret bg-creme p-5";
const boutonSecondaire =
  "press h-11 shrink-0 rounded-[14px_18px_16px_12px] border-[2.5px] px-3.5 text-sm font-extrabold disabled:opacity-60";
const boutonPrincipal =
  "press flex h-[58px] w-full items-center justify-center gap-2.5 rounded-[18px_22px_20px_16px] bg-foret font-display text-xl font-semibold text-or shadow-[0_6px_0_#411102] disabled:opacity-60";

const LIBELLES: Record<AccesFoyer, string> = {
  proprietaire: "A créé le foyer",
  edit: "Peut modifier",
  view: "Peut seulement voir",
};

const jour = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  timeZone: "Africa/Abidjan",
});
const heure = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Abidjan",
});

/** « mercredi 21 à 10:58 » (heure d'Abidjan). */
const expiration = (date: Date) => `${jour.format(date)} à ${heure.format(date)}`;

/** Appel à l'API ; renvoie le corps en cas de succès, ou lève le message d'erreur à afficher. */
async function appeler<T>(adresse: string, methode: string, corps?: unknown): Promise<T> {
  let reponse: Response;
  try {
    reponse = await fetch(adresse, {
      method: methode,
      headers: corps === undefined ? undefined : { "Content-Type": "application/json" },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
  } catch {
    throw new Error("Pas de connexion internet. Réessaie dans un instant.");
  }
  const donnees = (await reponse.json().catch(() => null)) as (T & CorpsErreur) | null;
  if (!reponse.ok) {
    throw new Error(donnees?.error?.message ?? "Un problème est survenu. Réessaie plus tard.");
  }
  return donnees as T;
}

const messageDe = (erreur: unknown) =>
  erreur instanceof Error ? erreur.message : "Un problème est survenu.";

type Props = { nomFoyer: string; acces: AccesFoyer; partage: PartageFoyer };

/** Le foyer partagé : comptes du foyer, codes d'invitation et droits (EF-03). */
export function PartageFoyerEcran({ nomFoyer, acces, partage }: Props) {
  const router = useRouter();
  const [personnes, setPersonnes] = useState(partage.personnes);
  const [invitations, setInvitations] = useState(partage.invitations);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const proprietaire = acces === "proprietaire";

  function annoncer(texte: string | null, probleme: string | null = null) {
    setMessage(texte);
    setErreur(probleme);
  }

  return (
    <>
      <section className={cadre}>
        <h2 className="font-display text-xl font-semibold text-foret">
          Les comptes du foyer ({personnes.length})
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {personnes.map((personne) => (
            <LignePersonne
              key={personne.id}
              personne={personne}
              gerable={proprietaire && !personne.moi}
              onChange={(modifiee) =>
                setPersonnes(personnes.map((p) => (p.id === modifiee.id ? modifiee : p)))
              }
              onRetiree={() => {
                setPersonnes(personnes.filter((p) => p.id !== personne.id));
                annoncer(`${personne.nom} ne fait plus partie du foyer.`);
              }}
              onErreur={(texte) => annoncer(null, texte)}
            />
          ))}
        </ul>
        {personnes.length === 1 && proprietaire && (
          <p className="mt-3 text-sm font-semibold text-cacao">
            Invite la personne qui fait les courses ou qui cuisine : vous verrez le même foyer, le
            même menu et la même liste.
          </p>
        )}
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
      </section>

      {proprietaire ? (
        <>
          <Inviter
            nomFoyer={nomFoyer}
            onCree={(invitation) => {
              setInvitations([...invitations, invitation]);
              router.refresh();
            }}
          />
          {invitations.length > 0 && (
            <CodesEnAttente
              invitations={invitations}
              onAnnulee={(id) => {
                setInvitations(invitations.filter((i) => i.id !== id));
                annoncer("Le code a été annulé : il ne marche plus.");
              }}
              onErreur={(texte) => annoncer(null, texte)}
            />
          )}
        </>
      ) : (
        <Quitter nomFoyer={nomFoyer} />
      )}
    </>
  );
}

function LignePersonne({
  personne,
  gerable,
  onChange,
  onRetiree,
  onErreur,
}: {
  personne: PersonneFoyer;
  gerable: boolean;
  onChange: (personne: PersonneFoyer) => void;
  onRetiree: () => void;
  onErreur: (message: string) => void;
}) {
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const autreAcces: Acces = personne.acces === "edit" ? "view" : "edit";

  async function agir(action: () => Promise<void>) {
    setEnCours(true);
    try {
      await action();
    } catch (erreur) {
      onErreur(messageDe(erreur));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <li className="rounded-[16px_12px_18px_14px] bg-sable/60 p-3.5">
      <p className="font-extrabold text-foret">
        {personne.nom}
        {personne.moi && " (toi)"}
      </p>
      <p className="text-sm font-bold text-cacao">{LIBELLES[personne.acces]}</p>

      {gerable &&
        (confirmer ? (
          <div role="alertdialog" aria-label={`Retirer ${personne.nom}`} className="mt-3">
            <p className="text-sm font-bold text-foret">
              Retirer {personne.nom} du foyer ? Son compte reste, mais sans accès à votre foyer.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={enCours}
                onClick={() =>
                  agir(async () => {
                    await appeler(`/api/household/users/${personne.id}`, "DELETE");
                    onRetiree();
                  })
                }
                className={`${boutonSecondaire} flex-1 border-carmin bg-carmin text-creme`}
              >
                {enCours ? "Un instant…" : "Oui, retirer"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmer(false)}
                className={`${boutonSecondaire} flex-1 border-foret text-foret`}
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={enCours}
              onClick={() =>
                agir(async () => {
                  await appeler(`/api/household/users/${personne.id}`, "PATCH", {
                    access: autreAcces,
                  });
                  onChange({ ...personne, acces: autreAcces });
                })
              }
              className={`${boutonSecondaire} border-foret text-foret`}
            >
              {autreAcces === "edit" ? "Lui permettre de modifier" : "Seulement voir"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmer(true)}
              className={`${boutonSecondaire} border-carmin text-carmin`}
            >
              Retirer
            </button>
          </div>
        ))}
    </li>
  );
}

function Inviter({
  nomFoyer,
  onCree,
}: {
  nomFoyer: string;
  onCree: (invitation: InvitationEnAttente) => void;
}) {
  const [access, setAccess] = useState<Acces>("edit");
  const [code, setCode] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function creer() {
    setEnCours(true);
    setErreur(null);
    try {
      const { invitation } = await appeler<{ invitation: InvitationEnAttente & { code: string } }>(
        "/api/household/invitations",
        "POST",
        { access },
      );
      setCode(invitation.code);
      setCopie(false);
      onCree(invitation);
    } catch (probleme) {
      setErreur(messageDe(probleme));
    } finally {
      setEnCours(false);
    }
  }

  async function copier(valeur: string) {
    try {
      await navigator.clipboard.writeText(valeur);
      setCopie(true);
    } catch {
      setErreur("La copie n'a pas marché : recopie le code à la main.");
    }
  }

  if (code) {
    return (
      <section className={cadre}>
        <h2 className="font-display text-xl font-semibold text-foret">Code d&apos;invitation</h2>
        <p
          className="mt-3 text-center font-display text-[40px] font-semibold tracking-[0.2em] text-foret"
          aria-label={`Code : ${code.split("").join(" ")}`}
        >
          {afficherCode(code)}
        </p>
        <p className="text-center text-sm font-bold text-cacao">
          Valable 48 h, une seule fois. Il ne sera plus affiché ensuite.
        </p>
        <a
          href={whatsappLink(texteInvitation(nomFoyer, code, window.location.origin))}
          target="_blank"
          rel="noopener noreferrer"
          className={`${boutonPrincipal} mt-4`}
        >
          <WhatsAppIcon size={24} /> Envoyer sur WhatsApp
        </a>
        <button
          type="button"
          onClick={() => copier(code)}
          className="press mt-3 h-12 w-full rounded-[16px_12px_18px_14px] border-[2.5px] border-foret font-extrabold text-foret"
        >
          {copie ? "Code copié !" : "Copier le code"}
        </button>
        {erreur && (
          <div className="mt-3">
            <MessageErreur>{erreur}</MessageErreur>
          </div>
        )}
        <button
          type="button"
          onClick={() => setCode(null)}
          className="press mt-2 h-11 w-full font-extrabold text-cacao"
        >
          Terminé
        </button>
      </section>
    );
  }

  return (
    <section className={cadre}>
      <h2 className="font-display text-xl font-semibold text-foret">Inviter quelqu&apos;un</h2>
      <fieldset className="mt-3">
        <legend className="text-[15px] font-extrabold text-foret">La personne…</legend>
        <div className="mt-2 flex flex-col gap-2">
          {ACCES.map((choix) => (
            <label
              key={choix.valeur}
              className={cx(
                "press flex min-h-[60px] cursor-pointer items-center gap-3 rounded-[16px_12px_18px_14px] border-[2.5px] px-4 py-2",
                access === choix.valeur ? "border-palme bg-palme/10" : "border-foret",
              )}
            >
              <input
                type="radio"
                name="access"
                value={choix.valeur}
                checked={access === choix.valeur}
                onChange={() => setAccess(choix.valeur)}
                className="h-5 w-5 accent-palme"
              />
              <span>
                <span className="block font-extrabold text-foret">{choix.libelle}</span>
                <span className="block text-sm font-bold text-cacao">{choix.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-3 rounded-[16px_12px_18px_14px] bg-or/50 px-4 py-3 text-sm font-bold text-foret">
        La personne invitée verra les membres du foyer, avec leurs allergies et leurs régimes.
      </p>
      {erreur && (
        <div className="mt-3">
          <MessageErreur>{erreur}</MessageErreur>
        </div>
      )}
      <button
        type="button"
        onClick={creer}
        disabled={enCours}
        className={`${boutonPrincipal} mt-4`}
      >
        {enCours ? "Un instant…" : "Créer un code"}
      </button>
    </section>
  );
}

function CodesEnAttente({
  invitations,
  onAnnulee,
  onErreur,
}: {
  invitations: InvitationEnAttente[];
  onAnnulee: (id: string) => void;
  onErreur: (message: string) => void;
}) {
  const [enCours, setEnCours] = useState<string | null>(null);

  async function annuler(id: string) {
    setEnCours(id);
    try {
      await appeler(`/api/household/invitations/${id}`, "DELETE");
      onAnnulee(id);
    } catch (erreur) {
      onErreur(messageDe(erreur));
    } finally {
      setEnCours(null);
    }
  }

  return (
    <section className={cadre}>
      <h2 className="font-display text-xl font-semibold text-foret">
        Codes en attente ({invitations.length})
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {invitations.map((invitation) => (
          <li
            key={invitation.id}
            className="flex items-center gap-3 rounded-[16px_12px_18px_14px] bg-sable/60 p-3.5"
          >
            <span className="flex-1">
              <span className="block font-extrabold text-foret">{LIBELLES[invitation.access]}</span>
              <span className="block text-sm font-bold text-cacao">
                Expire {expiration(new Date(invitation.expiresAt))}
              </span>
            </span>
            <button
              type="button"
              disabled={enCours === invitation.id}
              onClick={() => annuler(invitation.id)}
              className={`${boutonSecondaire} border-carmin text-carmin`}
            >
              Annuler
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Quitter({ nomFoyer }: { nomFoyer: string }) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function quitter() {
    setEnCours(true);
    setErreur(null);
    try {
      await appeler("/api/household/leave", "POST");
      router.push("/foyer");
      router.refresh();
    } catch (probleme) {
      setErreur(messageDe(probleme));
      setEnCours(false);
    }
  }

  return (
    <section className={cadre}>
      {confirmer ? (
        <div role="alertdialog" aria-label="Quitter ce foyer">
          <p className="font-bold text-foret">
            Quitter « {nomFoyer} » ? Tu ne verras plus son menu ni sa liste. Il faudra un nouveau
            code pour revenir.
          </p>
          {erreur && (
            <div className="mt-3">
              <MessageErreur>{erreur}</MessageErreur>
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={quitter}
              disabled={enCours}
              className={`${boutonSecondaire} flex-1 border-carmin bg-carmin text-creme`}
            >
              {enCours ? "Un instant…" : "Oui, quitter"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmer(false)}
              className={`${boutonSecondaire} flex-1 border-foret text-foret`}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmer(true)}
          className="press h-12 w-full rounded-[16px_12px_18px_14px] border-[2.5px] border-carmin font-extrabold text-carmin"
        >
          Quitter ce foyer
        </button>
      )}
    </section>
  );
}
