import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { UpdateManager } from "@/components/pwa/update-manager";
import { body, heading } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "OneSeiMangkeiSEZ", template: "%s · OneSeiMangkeiSEZ" },
  description: "Gerbang digital tunggal KINRA untuk karyawan dan tenant.",
  robots: { index: false, follow: false },
  applicationName: "OneSeiMangkeiSEZ",
  appleWebApp: { capable: true, title: "OneSeiMangkeiSEZ", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f172a" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading request headers forces dynamic rendering so every page gets a fresh CSP nonce.
  await headers();
  return (
    <html lang="id" className={`${heading.variable} ${body.variable}`}>
      <body className="min-h-screen font-sans text-[15px] antialiased sm:text-base">
        {children}
        <UpdateManager />
      </body>
    </html>
  );
}
