import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { Logo } from "@/components/illustrations/personnages";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Déjà connectée : pas besoin de revoir ces écrans.
  const session = await auth();
  if (session?.user?.id) redirect("/accueil");

  return (
    <main className="flex min-h-dvh flex-col px-6 pb-10 pt-7 text-foret">
      <div className="retro flex items-center gap-2 text-[22px] leading-[1.2]">
        <Logo /> Kitch&apos;N-Flow
      </div>
      {children}
    </main>
  );
}
