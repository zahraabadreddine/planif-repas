import type { Geste } from "@/lib/catalogue/gestes";

// Petit dessin du geste d'une étape, dans le style « magnets de frigo » des aliments :
// formes plates, contour foncé, couleurs du thème. Décoratif : le texte de l'étape suffit.

const INK = "#13260F";
const TRAIT = {
  stroke: INK,
  strokeWidth: 2.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Couper() {
  return (
    <>
      <rect x="6" y="34" width="46" height="20" rx="6" fill="#F3C98B" {...TRAIT} />
      <circle cx="44" cy="44" r="6" fill="#E2492F" {...TRAIT} />
      <circle cx="44" cy="44" r="2" fill="#FDD973" />
      <path d="M12 30L40 12l4 5-26 17z" fill="#FFF4DF" {...TRAIT} />
      <path d="M40 12l8-6 6 7-10 4z" fill="#6B3A1E" {...TRAIT} />
    </>
  );
}

function Eplucher() {
  return (
    <>
      <ellipse cx="26" cy="38" rx="17" ry="13" fill="#F3C98B" {...TRAIT} />
      <circle cx="20" cy="35" r="1.6" fill="#6B3A1E" />
      <circle cx="30" cy="42" r="1.6" fill="#6B3A1E" />
      <path
        d="M41 32q8-2 10 6t-6 12"
        fill="none"
        stroke="#F9A11B"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <path d="M40 26l10-14 6 4-10 14z" fill="#344F30" {...TRAIT} />
    </>
  );
}

function Laver() {
  return (
    <>
      <path d="M10 14h26v8H22v6" fill="none" {...TRAIT} />
      <path d="M22 28v4" stroke="#2C4A4A" strokeWidth={5} strokeLinecap="round" />
      <path
        d="M21 37q-3 5 0 7q3-2 0-7zM27 35q-3 5 0 7q3-2 0-7z"
        fill="#8FC1C9"
        {...TRAIT}
        strokeWidth={1.8}
      />
      <path d="M6 44h44q-2 14-22 14T6 44z" fill="#F3DDB8" {...TRAIT} />
    </>
  );
}

function Melanger() {
  return (
    <>
      <path d="M44 8L30 36" stroke="#6B3A1E" strokeWidth={5} strokeLinecap="round" />
      <path d="M6 32h48q-2 22-24 22T6 32z" fill="#F47230" {...TRAIT} />
      <path
        d="M18 40q6 5 12 0t12 0"
        fill="none"
        stroke="#FFF4DF"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </>
  );
}

function Mixer() {
  return (
    <>
      <path d="M40 6l-12 26" stroke="#F3C98B" strokeWidth={7} strokeLinecap="round" />
      <path d="M40 6l-12 26" fill="none" {...TRAIT} strokeWidth={1.5} />
      <path d="M10 32h44l-6 18q-1 4-6 4H22q-5 0-6-4z" fill="#6B3A1E" {...TRAIT} />
      <path d="M14 38h36" stroke="#9F350B" strokeWidth={2} />
    </>
  );
}

function Marmite() {
  return (
    <>
      <path
        d="M22 16q-4-5 0-10M32 16q-4-5 0-10M42 16q-4-5 0-10"
        fill="none"
        {...TRAIT}
        strokeWidth={2}
      />
      <rect x="10" y="26" width="44" height="28" rx="7" fill="#2C4A4A" {...TRAIT} />
      <path d="M8 24h48" {...TRAIT} />
      <path d="M10 34H4M54 34h6" {...TRAIT} />
      <path d="M28 20h8" stroke="#FDD973" strokeWidth={4} strokeLinecap="round" />
    </>
  );
}

function Poele() {
  return (
    <>
      <path d="M20 14q-3-4 0-8M30 14q-3-4 0-8" fill="none" {...TRAIT} strokeWidth={2} />
      <ellipse cx="26" cy="36" rx="22" ry="12" fill="#13260F" {...TRAIT} />
      <ellipse cx="26" cy="34" rx="17" ry="8" fill="#344F30" />
      <circle cx="20" cy="34" r="3.5" fill="#FDD973" />
      <circle cx="30" cy="32" r="3" fill="#F29CB0" />
      <path d="M47 38l14 6" stroke="#6B3A1E" strokeWidth={5} strokeLinecap="round" />
    </>
  );
}

function Griller() {
  return (
    <>
      <path d="M14 28q14-12 30 0q-16 12-30 0z" fill="#F47230" {...TRAIT} />
      <path d="M14 28l-7-6v12z" fill="#9F350B" />
      <circle cx="37" cy="26" r="1.8" fill={INK} />
      <path d="M6 40h52M12 36v8M24 36v8M36 36v8M48 36v8" {...TRAIT} />
      <path
        d="M12 54q4-8 8 0q4-8 8 0q4-8 8 0q4-8 8 0q4-8 8 0"
        fill="#E2492F"
        {...TRAIT}
        strokeWidth={2}
      />
    </>
  );
}

function Four() {
  return (
    <>
      <rect x="8" y="10" width="48" height="46" rx="6" fill="#F3DDB8" {...TRAIT} />
      <circle cx="18" cy="18" r="2.5" fill={INK} />
      <circle cx="27" cy="18" r="2.5" fill={INK} />
      <rect x="14" y="26" width="36" height="22" rx="4" fill="#FDD973" {...TRAIT} />
      <path
        d="M22 40q3-5 0-9M32 40q3-5 0-9M42 40q3-5 0-9"
        fill="none"
        stroke="#F47230"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </>
  );
}

function Verser() {
  return (
    <>
      <path d="M8 18l18-10 6 10-16 10z" fill="#8FC1C9" {...TRAIT} />
      <circle cx="34" cy="26" r="2.4" fill="#F47230" />
      <circle cx="38" cy="33" r="2.4" fill="#344F30" />
      <circle cx="33" cy="38" r="2.4" fill="#E2492F" />
      <path d="M14 44h40q-2 12-20 12T14 44z" fill="#F3C98B" {...TRAIT} />
    </>
  );
}

function Servir() {
  return (
    <>
      <ellipse cx="32" cy="42" rx="26" ry="12" fill="#FFF4DF" {...TRAIT} />
      <ellipse cx="32" cy="40" rx="17" ry="7" fill="#F3DDB8" />
      <circle cx="26" cy="38" r="6" fill="#FDD973" {...TRAIT} strokeWidth={2} />
      <path d="M34 40q4-10 12-8q-2 8-12 8z" fill="#344F30" {...TRAIT} strokeWidth={2} />
      <path
        d="M30 18l2-6 2 6M22 22l-3-5M42 22l3-5"
        fill="none"
        stroke="#F47230"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </>
  );
}

const DESSINS: Record<Geste, () => React.JSX.Element> = {
  couper: Couper,
  eplucher: Eplucher,
  laver: Laver,
  melanger: Melanger,
  mixer: Mixer,
  marmite: Marmite,
  poele: Poele,
  griller: Griller,
  four: Four,
  verser: Verser,
  servir: Servir,
};

export function GesteEtape({ geste, size = 64 }: { geste: Geste; size?: number }) {
  const Dessin = DESSINS[geste];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="shrink-0 -rotate-3 animate-float"
    >
      <Dessin />
    </svg>
  );
}
