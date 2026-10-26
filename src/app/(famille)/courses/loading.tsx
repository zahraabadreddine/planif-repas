// Pendant la lecture de la liste : un ticket vide qui patiente.

export default function ChargementCourses() {
  return (
    <div className="-mx-5 -mb-[190px] -mt-6 min-h-dvh bg-mangue px-5 pb-[190px] pt-[22px]">
      <h1 className="retro text-[30px] leading-[1.3]">Les courses</h1>
      <div
        className="paper-shadow mt-5 animate-pulse bg-[#FFFDF7] px-[18px] py-5"
        role="status"
        aria-live="polite"
      >
        <p className="font-hand text-[23px] font-bold text-puce">On prépare ton ticket…</p>
        <div className="mt-3 space-y-3">
          <div className="h-4 w-3/4 rounded bg-biscuit/60" />
          <div className="h-4 w-2/3 rounded bg-biscuit/60" />
          <div className="h-4 w-1/2 rounded bg-biscuit/60" />
        </div>
      </div>
    </div>
  );
}
