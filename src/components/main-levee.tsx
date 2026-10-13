// Petits éléments « faits main » réutilisés partout : notes manuscrites, flèches, soulignés, scotch.
import { cx } from "@/lib/format";

/** Texte écrit à la main (police Caveat), légèrement penché */
export function HandNote({
  children,
  className,
  tilt = -3,
  as: Tag = "span",
}: {
  children: React.ReactNode;
  className?: string;
  tilt?: number;
  as?: "span" | "p" | "div";
}) {
  return (
    <Tag
      className={cx("inline-block font-hand font-bold leading-none", className)}
      style={{ transform: `rotate(${tilt}deg)`, transformOrigin: "left center" }}
    >
      {children}
    </Tag>
  );
}

/** Soulignement tremblé ; animated = il se dessine à l'arrivée */
export function Squiggle({
  width = 40,
  color = "currentColor",
  className,
  animated = false,
}: {
  width?: number;
  color?: string;
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg width={width} height={8} viewBox="0 0 40 8" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path
        d="M2 5c7-4 12 2 19-1s11-2 17 0"
        stroke={color}
        strokeWidth={2.8}
        fill="none"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className={animated ? "drawn animate-draw" : undefined}
      />
    </svg>
  );
}

/** Flèche dessinée */
export function HandArrow({ className, color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg width="34" height="30" viewBox="0 0 34 30" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M4 4c2 12 10 18 24 18" />
      <path d="M22 16l7 6-8 4" />
    </svg>
  );
}

/** Bout de scotch */
export function Tape({ className, color = "bg-rose" }: { className?: string; color?: string }) {
  return <span aria-hidden="true" className={cx("absolute block h-[20px] w-[72px] opacity-85", color, className)} />;
}

/** Punaise ronde (post-it du frigo) */
export function Pin({ color = "bg-tomate" }: { color?: string }) {
  return <span aria-hidden="true" className={cx("absolute -top-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-foret", color)} />;
}
