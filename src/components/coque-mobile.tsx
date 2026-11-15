import { Grain } from "@/components/grain";

export function CoqueMobile({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-[430px] overflow-x-hidden bg-creme shadow-xl">
      {children}
      <Grain />
    </div>
  );
}
