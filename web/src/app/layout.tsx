import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dres — Clasificación documental",
  description:
    "Sube documentos y deja que un modelo decida automáticamente si son públicos o privados.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${fraunces.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <Script id="tema-inicial" strategy="beforeInteractive">
          {`
try {
  if (localStorage.getItem("dres_tema") === "oscuro") {
    document.documentElement.classList.add("dark");
  }
} catch {}
`}
        </Script>
        {children}
      </body>
    </html>
  );
}
