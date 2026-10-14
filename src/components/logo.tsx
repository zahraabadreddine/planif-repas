/**
 * Logo Umami (piste B) : le « U » ce sont les bras levés d'Umi, qui fait sauter un œuf dans la poêle.
 */
export function UmamiLogo({ width = 128, className }: { width?: number; className?: string }) {
  return (
    <svg
      width={width}
      height={(width * 180) / 330}
      viewBox="44 60 330 180"
      className={className}
      role="img"
      aria-label="umami"
    >
      <g className="origin-[104px_120px] animate-float">
        <circle cx="104" cy="106" r="24" fill="#2C4A4A" stroke="#13260F" strokeWidth={3} />
        <circle cx="104" cy="106" r="15" fill="#8FC1C9" />
        <ellipse cx="101" cy="104" rx="10" ry="8" fill="#FFFFFF" />
        <circle cx="103" cy="105" r="4.5" fill="#F9A11B" />
        <path d="M124 94 L156 76" stroke="#13260F" strokeWidth={6} strokeLinecap="round" />
      </g>
      <path
        d="M66 96 C62 140 62 180 76 204 C92 230 136 230 152 204 C166 180 166 140 162 80"
        fill="none"
        stroke="#344F30"
        strokeWidth={30}
        strokeLinecap="round"
      />
      <circle cx="114" cy="196" r="21" fill="#13260F" />
      <path
        d="M105 194 q3 -3 6 0 M117 194 q3 -3 6 0 M108 202 q6 5 12 0"
        fill="none"
        stroke="#FDD973"
        strokeWidth={2.6}
        strokeLinecap="round"
      />
      <text
        x="186"
        y="226"
        fontFamily="var(--font-fredoka), sans-serif"
        fontWeight={700}
        fontSize={80}
        fill="#344F30"
        letterSpacing={-1}
      >
        mami
      </text>
    </svg>
  );
}
