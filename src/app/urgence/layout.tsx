import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

/** Écran plein écran réservé aux comptes connectés. */
export default async function LayoutProtege({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  return children;
}
