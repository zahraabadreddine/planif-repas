import { redirect } from "next/navigation";
import { BottomNav } from "@/components/barre-navigation";
import { auth } from "@/lib/auth/config";

/** Écrans principaux : réservés aux comptes connectés, avec la barre de navigation du bas. */
export default async function TabsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  return (
    <>
      <main className="px-5 pb-[190px] pt-6">{children}</main>
      <BottomNav />
    </>
  );
}
