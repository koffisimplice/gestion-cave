import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Gestion Cave",
  description: "Gestion de stock, ventes et rentabilité de vos maquis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
