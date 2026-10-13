import { Aubergine, Fish, PizzaSlice, Tomato } from "./illustrations/Food";

/** Lettres façon magnets de frigo, chacune d'une couleur */
const MAGNET_COLORS = ["#F29CB0", "#344F30", "#F47230", "#2C4A4A", "#F9A11B", "#9F350B", "#8FC1C9"];

export function MagnetWord({ word, offset = 0, className = "" }: { word: string; offset?: number; className?: string }) {
  return (
    <span className={`font-display font-bold tracking-wide ${className}`} aria-label={word}>
      {word.split("").map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="inline-block"
          style={{
            color: MAGNET_COLORS[(i + offset) % MAGNET_COLORS.length],
            transform: `rotate(${((i * 37) % 11) - 5}deg)`,
          }}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

/** Le frigo illustré de l'écran de bienvenue */
export function FridgeHero() {
  return (
    <div className="relative mx-auto h-[330px] w-[250px]" aria-hidden="true">
      <div className="absolute left-[10px] top-0 h-[318px] w-[230px] -rotate-[1.2deg] rounded-[30px_26px_28px_24px] border-[3px] border-foret bg-creme shadow-[8px_10px_0_#9F350B]" />
      <div className="absolute left-[13px] top-[112px] h-[3px] w-[224px] -rotate-[1.2deg] bg-foret" />
      <div className="absolute left-[30px] top-[30px] h-[58px] w-[10px] rounded-md border-[3px] border-foret bg-lagon" />
      <div className="absolute left-[30px] top-[140px] h-[80px] w-[10px] rounded-md border-[3px] border-foret bg-lagon" />
      <div className="absolute left-[30px] top-[318px] h-[12px] w-[190px] rounded-b-[10px] bg-canard" />

      <MagnetWord word="on" className="absolute left-[64px] top-[46px] text-[34px] leading-none" />
      <MagnetWord word="mange" offset={2} className="absolute left-[56px] top-[140px] text-[38px] leading-none" />
      <MagnetWord word="quoi ?" offset={5} className="absolute left-[70px] top-[196px] text-[38px] leading-none" />

      <PizzaSlice className="absolute left-[150px] top-[22px] animate-float" />
      <Fish size={64} className="absolute left-[160px] top-[128px] animate-float [animation-delay:.5s]" />
      <Aubergine size={50} className="absolute left-[196px] top-[78px] animate-float [animation-delay:1.6s]" />
      <Tomato size={52} className="absolute left-[168px] top-[248px] animate-float [animation-delay:1.1s]" />
    </div>
  );
}
