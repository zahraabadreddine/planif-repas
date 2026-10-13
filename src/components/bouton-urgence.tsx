import Link from "next/link";
import { BoltIcon } from "./icones";
import { cx } from "@/lib/format";

type Props = {
  /** "pill" = autocollant flottant avec texte, "round" = rond flottant, "square" = petit bouton d'en-tête */
  variant?: "pill" | "round" | "square";
  className?: string;
};

/**
 * Le bouton « Pas le temps ? » reste visible sur les écrans (cahier des charges, ergonomie).
 * Il ressemble à un autocollant un peu de travers, qui donne un petit coup de coude de temps en temps.
 */
export function UrgencyButton({ variant = "pill", className }: Props) {
  if (variant === "square") {
    return (
      <Link
        href="/urgence"
        aria-label="Mode urgence : pas le temps ?"
        className={cx(
          "press blob flex h-11 w-11 shrink-0 -rotate-6 items-center justify-center border-[2.5px] border-foret bg-sirop shadow-[0_3px_0_#13260F]",
          className,
        )}
      >
        <BoltIcon size={20} />
      </Link>
    );
  }

  const floating =
    "fixed bottom-[102px] right-[max(18px,calc(50%-197px))] z-40 animate-nudge border-[2.5px] border-foret bg-sirop shadow-[0_4px_0_#13260F]";

  if (variant === "round") {
    return (
      <Link
        href="/urgence"
        aria-label="Mode urgence : pas le temps ?"
        className={cx(
          floating,
          "press blob flex h-[56px] w-[56px] items-center justify-center",
          className,
        )}
      >
        <BoltIcon size={24} />
      </Link>
    );
  }

  return (
    <Link
      href="/urgence"
      className={cx(
        floating,
        "press wonky flex h-[50px] items-center gap-2 pl-3.5 pr-[18px] font-display text-base font-bold text-puce",
        className,
      )}
    >
      <BoltIcon size={20} />
      Pas le temps&nbsp;?
    </Link>
  );
}
