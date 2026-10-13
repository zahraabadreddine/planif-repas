/**
 * Grain papier posé sur toute l'app (comme une illustration imprimée en risographie).
 * C'est ce qui retire l'effet « écran trop lisse ».
 */
export function Grain() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-0 left-1/2 z-[60] h-full w-full max-w-[430px] -translate-x-1/2 opacity-[0.17] mix-blend-multiply"
    >
      <filter id="kf-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={3} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#kf-grain)" />
    </svg>
  );
}
