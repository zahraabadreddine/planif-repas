import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { CoqueMobile } from "@/components/coque-mobile";

/** Écran plein écran réservé aux comptes connectés. */
export default async function LayoutProtege({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  return <CoqueMobile>{children}</CoqueMobile>;
}
