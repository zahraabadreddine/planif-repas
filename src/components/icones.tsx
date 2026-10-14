// Icônes au trait (stroke = currentColor) : elles prennent la couleur du texte.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 22, children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
  </Base>
);
export const CalendarIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Base>
);
export const ChatIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 5h16v11H9l-5 4z" />
  </Base>
);
export const CartIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M3 4h2l2.4 11h11L21 8H6" />
    <circle cx="9" cy="19" r="1.5" />
    <circle cx="17" cy="19" r="1.5" />
  </Base>
);
export const FridgeIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="6" y="2" width="12" height="20" rx="2" />
    <path d="M6 9h12M9 5v2M9 12v3" />
  </Base>
);
export const UserIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1-5 4-7 8-7s7 2 8 7" />
  </Base>
);
export const ChevronRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 6l6 6-6 6" />
  </Base>
);
export const ChevronLeft = (p: IconProps) => (
  <Base {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Base>
);
export const ArrowRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);
export const CloseIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);
export const CheckIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 12l5 5L20 6" />
  </Base>
);
export const SwapIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h13l-3-3M20 17H7l3 3" />
  </Base>
);
export const ShareIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4" />
  </Base>
);
export const SendIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 12l16-8-6 16-3-7z" />
  </Base>
);
export const PinIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" />
    <circle cx="12" cy="9" r="2.5" />
  </Base>
);
export const ClockIcon = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l3 2M9 2h6" />
  </Base>
);
export const WalletIcon = (p: IconProps) => (
  <Base {...p}>
    <rect x="3" y="6" width="18" height="13" rx="3" />
    <circle cx="12" cy="12.5" r="2.5" />
  </Base>
);
export const WhatsAppIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z" />
    <path d="M9 9.5c.5 2 2.5 4 4.5 4.5l1-1.5 2 1-.5 1.5c-3 .5-7-3.5-6.5-6.5l1.5-.5 1 2z" />
  </Base>
);
export const PlusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);
export const MinusIcon = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14" />
  </Base>
);

/** L'éclair du mode urgence (rempli) */
export function BoltIcon({ size = 22, ...p }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...p}>
      <path
        d="M13 2L4 14h7l-1 8 9-12h-7z"
        fill="#FDD973"
        stroke="#411102"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}
