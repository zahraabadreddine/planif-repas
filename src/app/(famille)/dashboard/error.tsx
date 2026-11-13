"use client";

export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
      <p className="font-hand text-xl text-carmin">Impossible de charger le tableau de bord.</p>
      <button
        onClick={reset}
        className="press h-11 rounded-[14px_18px_16px_12px] bg-foret px-5 text-sm font-extrabold text-creme"
      >
        Réessayer
      </button>
    </div>
  );
}
