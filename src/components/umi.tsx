// Umi, l'assistante d'Umami : le « i » qui prend vie (corps vert, tête ronde, toque, spatule).

export type UmiMood = "contente" | "reflechit" | "urgence";

/** Visage d'Umi selon son humeur (coordonnées du dessin complet, viewBox 0 0 200 260) */
function Face({ mood }: { mood: UmiMood }) {
  if (mood === "reflechit") {
    return (
      <>
        <circle cx="93" cy="103" r="3.5" fill="#FDD973" />
        <circle cx="111" cy="103" r="3.5" fill="#FDD973" />
        <path
          d="M96 120 q5 -3 10 0"
          fill="none"
          stroke="#FDD973"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </>
    );
  }
  if (mood === "urgence") {
    return (
      <>
        <circle cx="91" cy="105" r="5.5" fill="#FFF4DF" />
        <circle cx="109" cy="105" r="5.5" fill="#FFF4DF" />
        <circle cx="92" cy="106" r="2.6" fill="#13260F" />
        <circle cx="110" cy="106" r="2.6" fill="#13260F" />
        <ellipse cx="100" cy="121" rx="5" ry="4.5" fill="#9F350B" />
        <path
          d="M128 92 q6 8 0 12 q-6 -4 0 -12 z"
          fill="#8FC1C9"
          stroke="#13260F"
          strokeWidth={1.5}
        />
      </>
    );
  }
  return (
    <>
      <path
        d="M86 108 q5 -6 10 0 M104 108 q5 -6 10 0 M92 118 q8 8 16 0"
        fill="none"
        stroke="#FDD973"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx="82" cy="118" r="4.5" fill="#F29CB0" />
      <circle cx="118" cy="118" r="4.5" fill="#F29CB0" />
    </>
  );
}

function HeadAndHat() {
  return (
    <>
      <circle cx="100" cy="108" r="28" fill="#344F30" stroke="#13260F" strokeWidth={3.5} />
      <path
        d="M74 84 C56 82 56 54 76 54 C76 34 96 30 100 44 C104 30 124 34 124 54 C144 54 144 82 126 84 Z"
        fill="#FFF4DF"
        stroke="#13260F"
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <rect
        x="76"
        y="78"
        width="48"
        height="13"
        rx="4"
        fill="#FFF4DF"
        stroke="#13260F"
        strokeWidth={3}
      />
    </>
  );
}

/** La tête d'Umi seule (avatar, tuiles, indicateurs) */
export function UmiHead({
  size = 40,
  mood = "contente",
  className,
}: {
  size?: number;
  mood?: UmiMood;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={(size * 104) / 88}
      viewBox="56 30 88 104"
      className={className}
      aria-hidden="true"
    >
      <HeadAndHat />
      <Face mood={mood} />
    </svg>
  );
}

/** Umi en entier, avec sa spatule qui s'agite */
export function UmiFull({
  size = 200,
  mood = "contente",
  className,
}: {
  size?: number;
  mood?: UmiMood;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={(size * 260) / 200}
      viewBox="0 0 200 260"
      className={className}
      aria-hidden="true"
    >
      <ellipse cx="100" cy="250" rx="60" ry="6" fill="#13260F" opacity={0.25} />
      <path
        d="M84 142 C86 138 114 138 116 142 L120 226 C121 236 132 240 136 246 L64 246 C68 240 79 236 80 226 Z"
        fill="#344F30"
        stroke="#13260F"
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
      <path d="M93 160 L95 220" stroke="#4E7344" strokeWidth={4} strokeLinecap="round" />
      <path
        d="M83 170 C66 176 60 192 66 204"
        fill="none"
        stroke="#13260F"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <circle cx="66" cy="206" r="6" fill="#344F30" stroke="#13260F" strokeWidth={3} />
      <g className="origin-[150px_164px] animate-wobble">
        <path
          d="M117 164 C134 160 146 146 150 132"
          fill="none"
          stroke="#13260F"
          strokeWidth={5}
          strokeLinecap="round"
        />
        <path d="M150 130 L162 92" stroke="#9F350B" strokeWidth={6} strokeLinecap="round" />
        <path
          d="M154 92 L174 96 L179 63 L160 59 Z"
          fill="#8FC1C9"
          stroke="#13260F"
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <path
          d="M163 67 L161 86 M170 68 L168 88"
          stroke="#13260F"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx="150" cy="130" r="6" fill="#344F30" stroke="#13260F" strokeWidth={3} />
      </g>
      <HeadAndHat />
      <Face mood={mood} />
    </svg>
  );
}
