// Petites illustrations plates d'aliments (style « magnets de frigo »).
import type { StockIcon } from "@/lib/types";

type Props = { size?: number; className?: string; style?: React.CSSProperties };

const INK = "#13260F";

export function Fish({ size = 56, className, style }: Props) {
  return (
    <svg
      width={size}
      height={size * 0.62}
      viewBox="0 0 64 40"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M8 20q20-18 44 0q-24 18-44 0z" fill="#F47230" stroke={INK} strokeWidth={2.5} />
      <path d="M8 20L0 10v20z" fill="#9F350B" />
      <circle cx="42" cy="18" r="2.5" fill={INK} />
      <path d="M24 14l6 12M32 13l5 11" stroke="#9F350B" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function Aubergine({ size = 40, className, style }: Props) {
  return (
    <svg
      width={size * 0.8}
      height={size}
      viewBox="0 0 40 50"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M20 12c10 0 14 10 12 22-2 10-8 14-12 14s-10-4-12-14C6 22 10 12 20 12z"
        fill="#5B2A4E"
        stroke={INK}
        strokeWidth={2.5}
      />
      <path d="M12 12c4 3 12 3 16 0l-3-6h-10z" fill="#344F30" />
      <ellipse cx="15" cy="26" rx="2.5" ry="5" fill="#FFF4DF" opacity={0.35} />
    </svg>
  );
}

export function Gombo({ size = 40, className, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M10 34L28 8c4-2 6 0 5 4L14 37c-3 2-6 0-4-3z"
        fill="#344F30"
        stroke={INK}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <path d="M30 8l4-5" stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M16 28l4 2M20 22l4 2" stroke="#9CC36B" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

export function Tomato({ size = 40, className, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <circle cx="26" cy="30" r="17" fill="#E2492F" stroke={INK} strokeWidth={2.5} />
      <path d="M18 14c4 2 6 4 8 4s5-3 8-4c-2 5-5 6-8 6s-6-1-8-6z" fill="#344F30" />
      <ellipse cx="20" cy="26" rx="4" ry="2.5" fill="#FFF4DF" opacity={0.6} />
    </svg>
  );
}

export function PizzaSlice({ size = 56, className, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path
        d="M10 40L28 6l18 34z"
        fill="#FDD973"
        stroke={INK}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
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
      <path
        d="M7 9h16l2 17H5z"
        fill="#FDD973"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M9 9l2-5h8l2 5" fill="#FFF4DF" stroke={INK} strokeWidth={2} />
      <path d="M11 16h8" stroke="#9F350B" strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
function Oil({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path
        d="M11 3h8v5l3 4v14a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V12l3-4z"
        fill="#F9A11B"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M8 16h14" stroke={INK} strokeWidth={2} />
    </svg>
  );
}
/** Oignon violet : bulbe rond, pelures en arcs, tige sèche en haut et racines en bas. */
function Onion({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path
        d="M15 7c-6 2-10 6-10 11 0 5 4 7 10 7s10-2 10-7c0-5-4-9-10-11z"
        fill="#8E3B6E"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        d="M15 8q-6 6-3 16M15 8q6 6 3 16M15 8v17"
        stroke="#D98BB5"
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M15 7l-1-5h2z"
        fill="#C98A4B"
        stroke={INK}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path
        d="M12 25l-1 3M15 25v3M18 25l1 3"
        stroke="#6B3A1E"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Crevette : corps courbé en anneaux, queue en éventail, antennes. */
function Shrimp({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path
        d="M22 7c4 3 5 9 2 14-3 4-9 6-14 4"
        fill="none"
        stroke={INK}
        strokeWidth={8.5}
        strokeLinecap="round"
      />
      <path
        d="M22 7c4 3 5 9 2 14-3 4-9 6-14 4"
        fill="none"
        stroke="#F47230"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path
        d="M25 13l-4 1M24 18l-4-1M20 22l-2-3"
        stroke="#9F350B"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <path
        d="M10 25l-6-3 1 6z"
        fill="#F9A11B"
        stroke={INK}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <circle cx="21" cy="8" r="1.2" fill={INK} />
      <path
        d="M21 6Q14 2 6 5M22 6Q17 0 9 1"
        stroke={INK}
        strokeWidth={1.2}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Gingembre : racine noueuse à plusieurs doigts, beige doré. */
function Ginger({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path
        d="M4 19c0-3 3-4 5-3l1-6c0-3 4-3 5 0v4l3-6c2-2 5-1 5 2l-2 6c3-1 6 1 5 4s-5 3-7 3H8c-3 0-4-1-4-4z"
        fill="#E8C27A"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        d="M8 21h3M14 18v3M19 20h3M12 12v2"
        stroke="#9F6A2E"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
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
      <path
        d="M9 8c8 0 14 6 14 16-6-2-14-8-14-16z"
        fill="#E2492F"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        d="M9 8c-1-3 0-5 3-6"
        stroke="#344F30"
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Chicken({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path
        d="M17 5c5 0 9 4 8 9-1 6-7 8-11 6l-4 4"
        fill="#F3C98B"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M17 5c-6 1-8 8-3 15" fill="#F3C98B" stroke={INK} strokeWidth={2} />
      <path
        d="M10 24l-3 1 1 3 3-1"
        fill="#FFF4DF"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M18 10q3 0 4 3" stroke="#9F350B" strokeWidth={2} fill="none" strokeLinecap="round" />
    </svg>
  );
}
function Meat({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path
        d="M6 12c2-6 12-8 18-3 3 3 2 9-3 11-6 3-12 2-14-2-1-2-2-4-1-6z"
        fill="#E2492F"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        d="M11 13q4-3 9 0"
        stroke="#FFF4DF"
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="21" cy="15" r="2" fill="#FFF4DF" stroke={INK} strokeWidth={1.5} />
    </svg>
  );
}
function Leaves({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path d="M15 27V14" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <path d="M15 16C8 16 5 10 7 4c6 0 9 6 8 12z" fill="#344F30" stroke={INK} strokeWidth={2} />
      <path d="M15 16c7 0 10-6 8-12-6 0-9 6-8 12z" fill="#9CC36B" stroke={INK} strokeWidth={2} />
      <path d="M11 22h8" stroke="#9F350B" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}
function Carrot({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path
        d="M8 9l13 3-10 16z"
        fill="#F47230"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        d="M14 10l2-7M17 11l5-5M11 9l-3-5"
        stroke="#344F30"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <path d="M12 15l3 1M11 20l2 1" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
function Tuber({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path
        d="M5 17c0-6 6-9 12-8s9 4 8 9-6 8-11 7-9-3-9-8z"
        fill="#C98A4B"
        stroke={INK}
        strokeWidth={2}
      />
      <circle cx="11" cy="15" r="1.4" fill="#6B3A1E" />
      <circle cx="18" cy="13" r="1.4" fill="#6B3A1E" />
      <circle cx="16" cy="20" r="1.4" fill="#6B3A1E" />
    </svg>
  );
}
function Plantain({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path
        d="M5 9c3 10 11 15 21 13-2 4-8 5-13 3S4 17 5 9z"
        fill="#FDD973"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M5 9l-1-4 3 1" stroke={INK} strokeWidth={2} fill="#344F30" strokeLinejoin="round" />
      <path
        d="M10 17q5 5 12 5"
        stroke="#F9A11B"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
function Lemon({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <ellipse cx="15" cy="17" rx="11" ry="8.5" fill="#FDD973" stroke={INK} strokeWidth={2} />
      <path d="M4 17h-1M27 17h-1" stroke={INK} strokeWidth={2} strokeLinecap="round" />
      <path d="M15 8.5c1-3 4-4 6-4-1 3-3 4-6 4z" fill="#344F30" stroke={INK} strokeWidth={1.5} />
      <ellipse cx="11" cy="14" rx="3" ry="1.6" fill="#FFF4DF" opacity={0.7} />
    </svg>
  );
}
function Pepper({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path
        d="M8 11c0-3 3-4 7-3 4-1 7 0 7 3 1 6 0 14-7 15-7-1-8-9-7-15z"
        fill="#9CC36B"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M15 8V4l3-1" stroke="#344F30" strokeWidth={2.5} fill="none" strokeLinecap="round" />
      <path d="M15 11v12" stroke="#344F30" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
function Garlic({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path
        d="M15 5c-2 4-9 7-9 13 0 5 4 8 9 8s9-3 9-8c0-6-7-9-9-13z"
        fill="#FFF4DF"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        d="M15 9v16M11 13q-2 6 0 11M19 13q2 6 0 11"
        stroke="#C9B79C"
        strokeWidth={1.5}
        fill="none"
      />
      <path d="M15 5V2" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}
function Milk({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path d="M9 9l3-5h6l3 5" fill="#8FC1C9" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <rect x="8" y="9" width="14" height="18" rx="2" fill="#FFF4DF" stroke={INK} strokeWidth={2} />
      <path d="M8 15h14v6H8z" fill="#8FC1C9" />
      <path d="M8 15h14M8 21h14" stroke={INK} strokeWidth={1.5} />
    </svg>
  );
}
function Beans({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path
        d="M8 10c0-3 2-5 7-5s7 2 7 5l2 14c0 2-1 3-3 3H9c-2 0-3-1-3-3z"
        fill="#F3DDB8"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M8 10h14" stroke={INK} strokeWidth={2} />
      <ellipse cx="12" cy="17" rx="2" ry="1.4" fill="#9F350B" />
      <ellipse cx="18" cy="18" rx="2" ry="1.4" fill="#9F350B" />
      <ellipse cx="15" cy="22" rx="2" ry="1.4" fill="#9F350B" />
    </svg>
  );
}
function Bread({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path
        d="M4 20c-1-3 1-5 4-7l13-8c3-1 5 0 6 2s0 5-3 7l-13 8c-3 1-6 1-7-2z"
        fill="#F3C98B"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        d="M10 15l3 3M14 12l3 3M18 10l3 3"
        stroke="#9F350B"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}
function Can({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <rect x="7" y="6" width="16" height="20" rx="3" fill="#F3DDB8" stroke={INK} strokeWidth={2} />
      <rect x="7" y="11" width="16" height="10" fill="#E2492F" stroke={INK} strokeWidth={2} />
      <path d="M7 8.5h16" stroke={INK} strokeWidth={1.5} />
    </svg>
  );
}
function Pouch({ size = 30 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <path
        d="M8 7h14l1 19H7z"
        fill="#8FC1C9"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path
        d="M8 7l1-3h12l1 3"
        fill="#2C4A4A"
        stroke={INK}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <rect
        x="11"
        y="13"
        width="8"
        height="6"
        rx="1"
        fill="#FFF4DF"
        stroke={INK}
        strokeWidth={1.5}
      />
    </svg>
  );
}

/** Choisit l'illustration d'un produit du stock */
export function StockIllustration({
  icon,
  size = 30,
  className,
}: {
  icon: StockIcon;
  size?: number;
  className?: string;
}) {
  switch (icon) {
    case "riz":
      return <Rice size={size} />;
    case "huile":
      return <Oil size={size} />;
    case "oignon":
      return <Onion size={size} />;
    case "oeuf":
      return <Egg size={size} />;
    case "tomate":
      return <Tomato size={size} className={className} />;
    case "piment":
      return <Chili size={size} />;
    case "poisson":
      return <Fish size={size * 1.4} className={className} />;
    case "aubergine":
      return <Aubergine size={size} className={className} />;
    case "gombo":
      return <Gombo size={size} className={className} />;
    case "crevette":
      return <Shrimp size={size} />;
    case "gingembre":
      return <Ginger size={size} />;
    case "poulet":
      return <Chicken size={size} />;
    case "viande":
      return <Meat size={size} />;
    case "feuilles":
      return <Leaves size={size} />;
    case "carotte":
      return <Carrot size={size} />;
    case "tubercule":
      return <Tuber size={size} />;
    case "plantain":
      return <Plantain size={size} />;
    case "citron":
      return <Lemon size={size} />;
    case "poivron":
      return <Pepper size={size} />;
    case "ail":
      return <Garlic size={size} />;
    case "lait":
      return <Milk size={size} />;
    case "grains":
      return <Beans size={size} />;
    case "pain":
      return <Bread size={size} />;
    case "conserve":
      return <Can size={size} />;
    case "sachet":
      return <Pouch size={size} />;
  }
}
