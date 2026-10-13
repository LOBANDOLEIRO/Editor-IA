import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Editor IA — vídeos com HyperFrames",
  description: "Crie vídeos para Reels, YouTube e feed direto do celular ou computador.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased font-sans">{children}</body>
    </html>
  );
}
