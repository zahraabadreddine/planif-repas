// Logo, mascotte (la marmite) et horloge du mode urgence.

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <circle cx="15" cy="17" r="11" fill="#13260F" />
      <rect x="4" y="11" width="22" height="4" rx="2" fill="#344F30" />
      <path
        d="M11 7c0-3 2-3 2-5M17 7c0-3 2-3 2-5"
        stroke="#13260F"
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** La marmite souriante : avatar de l'assistant */
export function PotMascot({ size = 50, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" className={className} aria-hidden="true">
      <g stroke="#FFF4DF" strokeWidth={2.5} fill="none" strokeLinecap="round">
        <path className="animate-steam" d="M24 12c-3-4 3-5 0-9" />
        <path className="animate-steam" style={{ animationDelay: ".7s" }} d="M36 12c-3-4 3-5 0-9" />
      </g>
      <rect x="8" y="20" width="44" height="32" rx="14" fill="#13260F" />
      <rect x="4" y="18" width="52" height="8" rx="4" fill="#344F30" />
      <circle cx="23" cy="36" r="3" fill="#FDD973" />
      <circle cx="37" cy="36" r="3" fill="#FDD973" />
      <path
        d="M25 43q5 4 10 0"
        stroke="#FDD973"
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Horloge qui court : aiguilles animées */
export function RunningClock({ size = 130, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size * 1.08}
      viewBox="0 0 100 108"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 46h14M6 60h12M0 74h14" stroke="#FFF4DF" strokeWidth={4} strokeLinecap="round" />
      <rect x="34" y="6" width="32" height="10" rx="4" fill="#13260F" />
      <path d="M22 22l-8-6M78 22l8-6" stroke="#13260F" strokeWidth={6} strokeLinecap="round" />
      <circle cx="50" cy="54" r="38" fill="#FDD973" stroke="#13260F" strokeWidth={5} />
      <circle cx="50" cy="54" r="29" fill="#FFF4DF" />
      <path
        d="M50 54V32"
        stroke="#9F350B"
        strokeWidth={5}
        strokeLinecap="round"
        className="animate-clock"
        style={{ transformOrigin: "50px 54px" }}
      />
      <path
        d="M50 54h15"
        stroke="#13260F"
        strokeWidth={5}
        strokeLinecap="round"
        className="animate-spin-slow"
        style={{ transformOrigin: "50px 54px" }}
      />
      <circle cx="50" cy="54" r="5" fill="#13260F" />
      <path d="M30 98l-6 8M70 98l6 8" stroke="#13260F" strokeWidth={6} strokeLinecap="round" />
    </svg>
  );
}

/** Sac de courses */
export function GroceryBag({ size = 46, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" className={className} aria-hidden="true">
      <path
        d="M12 22h36l-4 30H16z"
        fill="#F9A11B"
        stroke="#FDD973"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <path d="M22 22c0-10 16-10 16 0" stroke="#FDD973" strokeWidth={3} fill="none" />
      <circle cx="30" cy="12" r="6" fill="#E2492F" />
      <path d="M24 16c-6-8 2-12 4-6" fill="#344F30" />
      <path d="M20 36h20" stroke="#411102" strokeWidth={2.5} strokeLinecap="round" />
    </svg>
  );
}

/** Mini frigo (en-tête de la page stock) */
export function MiniFridge({ size = 58, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" className={className} aria-hidden="true">
      <rect
        x="14"
        y="4"
        width="32"
        height="52"
        rx="8"
        fill="#FFF4DF"
        stroke="#13260F"
        strokeWidth={3}
      />
      <path d="M14 22h32" stroke="#13260F" strokeWidth={3} />
      <rect x="19" y="10" width="3" height="8" rx="1.5" fill="#13260F" />
      <rect x="19" y="28" width="3" height="10" rx="1.5" fill="#13260F" />
      <circle cx="36" cy="14" r="4" fill="#F47230" />
      <circle cx="34" cy="36" r="4" fill="#F29CB0" />
      <rect x="30" y="42" width="8" height="5" rx="2" fill="#FDD973" />
    </svg>
  );
}
