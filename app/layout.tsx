import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "∆ THE MENU",
  description: "Home Chef app",
  icons: {
    icon: '/triangle.svg',
  },
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
          {children}
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
