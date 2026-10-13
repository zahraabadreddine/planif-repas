import { BottomNav } from "@/components/barre-navigation";

/** Écrans principaux : ils partagent la barre de navigation du bas. */
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="px-5 pb-[190px] pt-6">{children}</main>
      <BottomNav />
    </>
  );
}
