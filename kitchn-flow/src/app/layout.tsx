import type { Metadata, Viewport } from "next";
import { Caveat, Fredoka, Nunito, Pacifico } from "next/font/google";
import { Grain } from "@/components/Grain";
import "./globals.css";

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-caveat",
  display: "swap",
});

// Titres rétro (proche de l'écriture « Retro Font » choisie pour l'app)
const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pacifico",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kitch'N-Flow",
  description:
    "Ton assistant cuisine : le menu de la semaine selon ton temps, ton budget en FCFA et ce qu'il reste dans le frigo.",
};

export const viewport: Viewport = {
  themeColor: "#F9A11B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${fredoka.variable} ${nunito.variable} ${caveat.variable} ${pacifico.variable}`}>
      <body className="min-h-dvh bg-sable/60 antialiased">
        {/* L'app est pensée téléphone : sur grand écran on centre une colonne mobile */}
        <div className="relative mx-auto min-h-dvh w-full max-w-[430px] overflow-x-hidden bg-creme shadow-xl">
          {children}
          <Grain />
        </div>
      </body>
    </html>
  );
}
