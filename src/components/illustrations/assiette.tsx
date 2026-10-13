import type { PlateColors } from "@/lib/types";

type Props = {
  colors: Pick<PlateColors, "base" | "top">;
  size?: number;
  steam?: boolean;
  className?: string;
};

/** Assiette générique : l'accompagnement + la sauce changent de couleur selon le plat */
export function Plate({ colors, size = 64, steam = false, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden="true">
      {steam && (
        <g stroke="#FFF4DF" strokeWidth={3} fill="none" strokeLinecap="round">
          <path className="animate-steam" d="M48 18c-4-6 4-8 0-14" />
          <path
            className="animate-steam"
            style={{ animationDelay: ".6s" }}
            d="M62 16c-4-6 4-8 0-14"
          />
          <path
            className="animate-steam"
            style={{ animationDelay: "1.2s" }}
            d="M76 18c-4-6 4-8 0-14"
          />
        </g>
      )}
      <ellipse cx="60" cy="110" rx="42" ry="6" fill="#13260F" opacity={0.25} />
      <circle cx="60" cy="64" r="46" fill="#FFFFFF" stroke="#13260F" strokeWidth={4} />
      <circle cx="60" cy="64" r="34" fill={colors.base} />
      <path
        d="M38 62c8-14 36-14 44 0-8 14-36 14-44 0z"
        fill={colors.top}
        stroke="#13260F"
        strokeWidth={3}
      />
      <circle cx="80" cy="80" r="7" fill="#E2492F" />
      <path
        d="M40 84c4-6 10-6 12 0"
        stroke="#344F30"
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Grande assiette détaillée : poisson braisé & attiéké */
export function AttiekePlate({ size = 180, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden="true">
      <g stroke="#FFF4DF" strokeWidth={3} fill="none" strokeLinecap="round">
        <path className="animate-steam" d="M48 18c-4-6 4-8 0-14" />
        <path
          className="animate-steam"
          style={{ animationDelay: ".6s" }}
          d="M62 16c-4-6 4-8 0-14"
        />
        <path
          className="animate-steam"
          style={{ animationDelay: "1.2s" }}
          d="M76 18c-4-6 4-8 0-14"
        />
      </g>
      <ellipse cx="60" cy="112" rx="44" ry="6" fill="#13260F" opacity={0.5} />
      <circle cx="60" cy="66" r="48" fill="#FFFFFF" stroke="#13260F" strokeWidth={4} />
      <circle
        cx="60"
        cy="66"
        r="48"
        fill="none"
        stroke="#8FC1C9"
        strokeWidth={6}
        strokeDasharray="4 6"
        opacity={0.9}
      />
      <ellipse cx="44" cy="74" rx="22" ry="16" fill="#FDD973" stroke="#13260F" strokeWidth={2.5} />
      {[
        [38, 70],
        [46, 78],
        [50, 68],
        [36, 80],
        [42, 64],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.6} fill="#F2C14E" />
      ))}
      <path d="M50 52q22-16 42 0q-20 16-42 0z" fill="#F47230" stroke="#13260F" strokeWidth={2.5} />
      <path
        d="M50 52l-10-8v16z"
        fill="#9F350B"
        stroke="#13260F"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <circle cx="84" cy="50" r="2.4" fill="#13260F" />
      <path d="M62 46l5 12M71 45l5 12" stroke="#9F350B" strokeWidth={2.4} strokeLinecap="round" />
      <circle cx="80" cy="82" r="9" fill="#E2492F" stroke="#13260F" strokeWidth={2} />
      <circle cx="80" cy="82" r="4" fill="#F29CB0" />
      <circle cx="64" cy="92" r="6" fill="none" stroke="#F29CB0" strokeWidth={3} />
      <path
        d="M28 58c4-4 8-4 10 0"
        stroke="#344F30"
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Bol de sauce (carte « ce soir » de l'accueil) */
export function SauceBowl({ size = 150, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden="true">
      <g stroke="#FFF4DF" strokeWidth={3} fill="none" strokeLinecap="round">
        <path className="animate-steam" d="M50 20c-4-6 4-8 0-14" />
        <path
          className="animate-steam"
          style={{ animationDelay: ".8s" }}
          d="M66 20c-4-6 4-8 0-14"
        />
      </g>
      <ellipse cx="60" cy="100" rx="44" ry="7" fill="#13260F" opacity={0.5} />
      <path
        d="M14 58h92c0 26-20 42-46 42S14 84 14 58z"
        fill="#8FC1C9"
        stroke="#13260F"
        strokeWidth={3}
      />
      <ellipse cx="60" cy="58" rx="46" ry="12" fill="#9F350B" stroke="#13260F" strokeWidth={3} />
      <ellipse cx="44" cy="54" rx="14" ry="6" fill="#FFF4DF" />
      <circle cx="70" cy="56" r="5" fill="#F47230" />
      <circle cx="82" cy="60" r="4" fill="#FDD973" />
      <circle cx="60" cy="62" r="3" fill="#344F30" />
    </svg>
  );
}
