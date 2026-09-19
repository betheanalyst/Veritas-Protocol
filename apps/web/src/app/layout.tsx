import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { ConfigErrorBoundary } from "@/components/layout/ConfigErrorBoundary";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Veritas — Make computation verifiable",
    template: "%s — Veritas",
  },
  description:
    "Veritas turns computation into results that can be evaluated, inspected, and challenged — decentralized verification on GenLayer.",
};

export const viewport: Viewport = {
  themeColor: "#0B0C0E",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-sans">
        <ConfigErrorBoundary>
          <Providers>
            <div className="flex min-h-screen flex-col">
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-bg-surface-2 focus:px-4 focus:py-2 focus:text-fg"
              >
                Skip to content
              </a>
              <Header />
              <main id="main-content" className="flex-1">{children}</main>
              <Footer />
            </div>
          </Providers>
        </ConfigErrorBoundary>
      </body>
    </html>
  );
}
