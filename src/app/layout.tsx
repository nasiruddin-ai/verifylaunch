import type { Metadata } from "next";
import { Suspense } from "react";
import {
  JetBrains_Mono,
  Newsreader,
  Plus_Jakarta_Sans,
} from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700"],
});

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: {
    default: "VerifyLaunch — Human-Tested Launches for Bootstrapped B2B & Dev SaaS",
    template: "%s · VerifyLaunch",
  },
  description:
    "Curated weekly drops of live, transparently priced B2B SaaS & developer tools—ranked by click-verified teardowns, never upvote rings.",
};

function NavbarFallback() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="font-serif text-xl font-medium tracking-tight text-ink">
          VerifyLaunch
        </div>
        <div className="h-7 w-40 rounded bg-surface-subtle" />
      </div>
    </header>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${newsreader.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink">
        <Suspense fallback={<NavbarFallback />}>
          <Navbar />
        </Suspense>
        <main className="flex-1">
          <Suspense
            fallback={
              <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
                <div className="h-8 w-64 rounded bg-surface-subtle" />
                <div className="mt-6 space-y-4">
                  <div className="h-28 rounded-lg bg-surface-subtle" />
                  <div className="h-28 rounded-lg bg-surface-subtle" />
                </div>
              </div>
            }
          >
            {children}
          </Suspense>
        </main>
        <footer className="mt-20 border-t border-border bg-surface">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <span className="font-serif text-sm font-medium text-ink">
                VerifyLaunch
              </span>
              <span>·</span>
              <span>
                Zero waitlists. Zero upvote rings. Money never buys rank.
              </span>
            </div>
            <div className="font-mono text-[11px]">
              Bootstrapped B2B &amp; Dev Tool Ledger
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
