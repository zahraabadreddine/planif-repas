// Petites illustrations plates d'aliments (style « magnets de frigo »).
import type { StockIcon } from "@/lib/types";

type Props = { size?: number; className?: string; style?: React.CSSProperties };

const INK = "#13260F";

export function Fish({ size = 56, className, style }: Props) {
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 64 40" className={className} style={style} aria-hidden="true">
      <path d="M8 20q20-18 44 0q-24 18-44 0z" fill="#F47230" stroke={INK} strokeWidth={2.5} />
      <path d="M8 20L0 10v20z" fill="#9F350B" />
      <circle cx="42" cy="18" r="2.5" fill={INK} />
      <path d="M24 14l6 12M32 13l5 11" stroke="#9F350B" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function Aubergine({ size = 40, className, style }: Props) {
  return (
    <svg width={size * 0.8} height={size} viewBox="0 0 40 50" className={className} style={style} aria-hidden="true">
      <path d="M20 12c10 0 14 10 12 22-2 10-8 14-12 14s-10-4-12-14C6 22 10 12 20 12z" fill="#5B2A4E" stroke={INK} strokeWidth={2.5} />
      <path d="M12 12c4 3 12 3 16 0l-3-6h-10z" fill="#344F30" />
      <ellipse cx="15" cy="26" rx="2.5" ry="5" fill="#FFF4DF" opacity={0.35} />
    </svg>
  );
}

export function Gombo({ size = 40, className, style }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} style={style} aria-hidden="true">
      <path d="M10 34L28 8c4-2 6 0 5 4L14 37c-3 2-6 0-4-3z" fill="#344F30" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M30 8l4-5" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M16 28l4 2M20 22l4 2" stroke="#9CC36B" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function Tomato({ size = 40, className, style }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" className={className} style={style} aria-hidden="true">
      <circle cx="26" cy="30" r="17" fill="#E2492F" stroke={INK} strokeWidth={2.5} />
      <path d="M18 14c4 2 6 4 8 4s5-3 8-4c-2 5-5 6-8 6s-6-1-8-6z" fill="#344F30" />
      <ellipse cx="20" cy="26" rx="4" ry="2.5" fill="#FFF4DF" opacity={0.6} />
    </svg>
  );
}

export function PizzaSlice({ size = 56, className, style }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" className={className} style={style} aria-hidden="true">
      <path d="M10 40L28 6l18 34z" fill="#FDD973" stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <path d="M10 40q18 10 36 0" fill="#F47230" stroke={INK} strokeWidth={2.5} />
      <circle cx="24" cy="24" r="3.5" fill="#E2492F" />
      <circle cx="33" cy="31" r="3.5" fill="#E2492F" />
      <circle cx="26" cy="35" r="3" fill="#E2492F" />
    </svg>
  );
}

function Rice({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path d="M7 9h16l2 17H5z" fill="#FDD973" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M9 9l2-5h8l2 5" fill="#FFF4DF" stroke={INK} strokeWidth={2} />
      <path d="M11 16h8" stroke="#9F350B" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
function Oil({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path d="M11 3h8v5l3 4v14a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V12l3-4z" fill="#F9A11B" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M8 16h14" stroke={INK} strokeWidth={2} />
    </svg>
  );
}
function Onion({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path d="M15 6c7 4 10 8 10 13a10 7 0 0 1-20 0c0-5 3-9 10-13z" fill="#F29CB0" stroke={INK} strokeWidth={2} />
      <path d="M15 6V2M15 10v15" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
function Egg({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <ellipse cx="15" cy="17" rx="9" ry="11" fill="#FFF4DF" stroke={INK} strokeWidth={2} />
      <ellipse cx="12" cy="13" rx="2" ry="3" fill="#FFFFFF" />
    </svg>
  );
}
function Chili({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path d="M9 8c8 0 14 6 14 16-6-2-14-8-14-16z" fill="#E2492F" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <path d="M9 8c-1-3 0-5 3-6" stroke="#344F30" strokeWidth={2.5} fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Choisit l'illustration d'un produit du stock */
export function StockIllustration({ icon, size = 30, className }: { icon: StockIcon; size?: number; className?: string }) {
  switch (icon) {
    case "riz": return <Rice size={size} />;
    case "huile": return <Oil size={size} />;
    case "oignon": return <Onion size={size} />;
    case "oeuf": return <Egg size={size} />;
    case "tomate": return <Tomato size={size} className={className} />;
    case "piment": return <Chili size={size} />;
    case "poisson": return <Fish size={size * 1.4} className={className} />;
    case "aubergine": return <Aubergine size={size} className={className} />;
    case "gombo": return <Gombo size={size} className={className} />;
  }
}
