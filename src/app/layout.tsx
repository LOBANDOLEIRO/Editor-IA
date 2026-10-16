import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Editor IA",
  description: "Crie thumbnails para YouTube, Instagram e TikTok com camadas, modelos e checklist de publicação.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#121116",
};

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Archivo:wght@400;500;600;700&family=Bangers&family=Bebas+Neue" +
  "&family=IBM+Plex+Mono:wght@400;500&family=Luckiest+Guy&family=Montserrat:wght@900&family=Oswald:wght@700&family=Permanent+Marker&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={FONTS_URL} />
      </head>
      <body>{children}</body>
    </html>
  );
}
