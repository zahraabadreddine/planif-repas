import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { UmamiLogo } from "@/components/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Déjà connectée : pas besoin de revoir ces écrans.
  const session = await auth();
  if (session?.user?.id) redirect("/accueil");

  return (
    <main className="flex min-h-dvh flex-col px-6 pb-10 pt-7 text-foret">
      <UmamiLogo className="-my-3.5 -ml-1.5" />
      {children}
    </main>
  );
}
