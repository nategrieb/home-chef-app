import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import AccessGate from "../components/AccessGate";

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "∆ THE MENU",
  description: "Home Chef app",
  appleWebApp: { capable: true, title: "THE MENU", statusBarStyle: "default" },
  icons: {
    icon: '/triangle.svg',
    apple: '/apple-touch-icon.png',
  },
  // Next only emits the unprefixed tag; older iOS versions still look for the Apple one.
  other: { 'apple-mobile-web-app-capable': 'yes' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} antialiased flex flex-col min-h-screen`}> 
        <main className="flex-grow">
          <AccessGate>{children}</AccessGate>
        </main>
        <footer className="sm:hidden py-4 text-center text-xs text-slate-500">
          <a
            href="https://nategrieb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-700"
          >
            nategrieb.com
          </a>
        </footer>
      </body>
    </html>
  );
}
