import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Editor IA — Estúdio",
  description: "Estúdio multitrack no navegador com beats gerados por IA (Lyria via Flow Music) e corretor de afinação.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0d0f14" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
