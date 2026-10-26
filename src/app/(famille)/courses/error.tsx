"use client";

// Si la liste n'a pas pu être lue : un message simple et un bouton pour réessayer.

export default function ErreurCourses({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="-mx-5 -mb-[190px] -mt-6 min-h-dvh bg-mangue px-5 pb-[190px] pt-[22px]">
      <h1 className="retro text-[30px] leading-[1.3]">Les courses</h1>
      <div className="paper-shadow mt-5 bg-[#FFFDF7] px-[18px] py-5 text-center" role="alert">
        <p className="font-hand text-[23px] font-bold leading-tight text-carmin">
          Ta liste n&apos;a pas pu être chargée
        </p>
        <p className="mt-2 text-sm font-bold text-cacao">Vérifie ta connexion, puis réessaie.</p>
        <button
          type="button"
          onClick={reset}
          className="press mt-4 inline-flex h-12 items-center rounded-[14px_18px_16px_12px] bg-foret px-5 text-sm font-extrabold text-creme"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
