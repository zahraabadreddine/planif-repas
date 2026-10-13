import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";

/** Espace administratrice : la garde de rôle est faite côté serveur. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (session.user.role !== "admin") redirect("/accueil");

  return <main className="px-5 pb-10 pt-6">{children}</main>;
}
