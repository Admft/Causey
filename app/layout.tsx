import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";
import { PrimaryNav } from "@/components/PrimaryNav";
import { CauseyLogo } from "@/components/CauseyLogo";
import { EarlyBuildBanner } from "@/components/EarlyBuildBanner";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: {
    default: "Causey — Find student competitions",
    template: "%s · Causey",
  },
  description:
    "Discover student competitions with eligibility, costs, and qualification pathways shown clearly.",
};

function ExternalMark() {
  return (
    <span aria-hidden="true" className="nudge-x">
      ↗
    </span>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${sourceSerif.variable}`}>
      <body className="flex min-h-screen flex-col">
        <div className="sticky top-0 z-50">
          <EarlyBuildBanner />
          <header className="border-b border-line bg-background/90 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-6xl items-center gap-5 px-5 sm:px-8">
              <Link
                href="/"
                aria-label="Causey home — browse competition types"
                className="shrink-0"
              >
                <CauseyLogo size="md" />
              </Link>
              <nav
                className="ml-auto flex min-w-0 items-center gap-4 overflow-x-auto sm:gap-6"
                aria-label="Primary"
              >
                <PrimaryNav />
                <AuthNav />
              </nav>
            </div>
          </header>
        </div>

        <main className="flex-1">{children}</main>

        <footer className="section-rule bg-surface py-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:flex-row sm:items-start sm:justify-between sm:px-8">
            <div className="flex flex-col gap-2">
              <CauseyLogo size="sm" />
              <p className="max-w-sm text-xs text-muted">
                Causey is an early build. Listings and pathways may be
                incomplete, wrong, or out of date. Always confirm details and
                register on the organizer&rsquo;s own site.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <Link
                href="/chess"
                className="font-medium text-muted-strong transition-colors hover:text-brand-red"
              >
                Chess tournaments
              </Link>
              <Link
                href="/pathways"
                className="font-medium text-muted-strong transition-colors hover:text-brand-red"
              >
                Qualification pathways
              </Link>
              <a
                href="https://causey.dev"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="About Causey — opens causey.dev in a new tab"
                className="group font-medium text-muted-strong transition-colors hover:text-brand-red"
              >
                About Causey <ExternalMark />
              </a>
              <p className="text-muted">© {new Date().getFullYear()} Causey</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
