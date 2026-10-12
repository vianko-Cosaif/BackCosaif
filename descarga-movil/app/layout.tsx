import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COSAIF · Centro de descargas",
  description: "Descarga COSAIF para Android. Centro de descargas y administración de versiones de COSAIF Logistics.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
