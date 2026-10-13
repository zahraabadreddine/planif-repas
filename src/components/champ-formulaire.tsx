import { cx } from "@/lib/format";

type Props = React.ComponentProps<"input"> & {
  label: string;
  erreur?: string;
};

/** Champ de saisie avec libellé et message d'erreur, au style « fait main ». */
export function ChampFormulaire({ label, erreur, id, className, ...props }: Props) {
  const idChamp = id ?? props.name;
  const idErreur = `${idChamp}-erreur`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={idChamp} className="text-[15px] font-extrabold text-foret">
        {label}
      </label>
      <input
        id={idChamp}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? idErreur : undefined}
        className={cx(
          "h-12 rounded-[14px_18px_16px_12px] border-[2.5px] bg-creme px-4 text-base font-bold text-foret placeholder:text-cacao/50",
          erreur ? "border-carmin" : "border-foret",
          className,
        )}
        {...props}
      />
      {erreur && (
        <p id={idErreur} role="alert" className="text-sm font-bold text-carmin">
          {erreur}
        </p>
      )}
    </div>
  );
}

/** Bandeau d'erreur générale d'un formulaire. */
export function MessageErreur({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-[16px_12px_18px_14px] border-[2.5px] border-carmin bg-rose/40 px-4 py-3 text-sm font-bold text-carmin"
    >
      {children}
    </p>
  );
}

/** Bouton principal d'un formulaire, désactivé pendant l'envoi. */
export function BoutonEnvoi({
  enCours,
  children,
}: {
  enCours: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={enCours}
      className="press flex h-[58px] w-full items-center justify-center gap-2.5 rounded-[18px_22px_20px_16px] bg-foret font-display text-xl font-semibold text-or shadow-[0_6px_0_#411102] disabled:opacity-60"
    >
      {enCours ? "Un instant…" : children}
    </button>
  );
}
