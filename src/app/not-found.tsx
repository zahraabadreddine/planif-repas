import Link from "next/link";
import { MagnetWord } from "@/components/frigo-anime";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-mangue px-6 text-center">
      <MagnetWord word="oups !" className="text-5xl" />
      <p className="font-bold text-puce">Cette page n&apos;est pas dans le frigo.</p>
      <Link href="/accueil" className="press rounded-2xl bg-foret px-5 py-3 font-extrabold text-or">
        Retour à l&apos;accueil
      </Link>
    </main>
  );
}
