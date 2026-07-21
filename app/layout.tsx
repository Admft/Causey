import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
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

// TODO: confirm the marketing site's section anchors once causey.dev ships
// its final nav (see SETUP.md step 7).
const MARKETING = {
  howItWorks: "https://causey.dev/#how-it-works",
  team: "https://causey.dev/#team",
  book: "https://causey.dev/#book",
};

function ExternalMark() {
  // Always-visible new-tab mark on external links (design system §2/§8.4).
  return <span aria-hidden="true">↗</span>;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sourceSans.variable} ${sourceSerif.variable}`}>
      <body className="flex min-h-screen flex-col">
        <div className="sticky top-0 z-50">
          <EarlyBuildBanner />
          <header className="border-b border-line bg-background/90 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
              <Link href="/" aria-label="Causey home — browse competition types">
                <CauseyLogo size="sm" />
              </Link>
              <nav className="flex items-center gap-5" aria-label="Primary">
                <Link
                  href="/"
                  className="text-sm font-medium text-muted-strong transition-colors hover:text-foreground"
                >
                  Competitions
                </Link>
                <Link
                  href="/chess"
                  className="text-sm font-medium text-muted-strong transition-colors hover:text-foreground"
                >
                  Chess
                </Link>
                <Link
                  href="/pathways"
                  className="text-sm font-medium text-muted-strong transition-colors hover:text-foreground"
                >
                  Pathways
                </Link>
                <a
                  href={MARKETING.howItWorks}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="How it works — opens causey.dev in a new tab"
                  className="hidden text-sm font-medium text-muted-strong transition-colors hover:text-foreground sm:inline-flex sm:items-center sm:gap-1"
                >
                  How it works <ExternalMark />
                </a>
                <a
                  href={MARKETING.team}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Team — opens causey.dev in a new tab"
                  className="hidden text-sm font-medium text-muted-strong transition-colors hover:text-foreground md:inline-flex md:items-center md:gap-1"
                >
                  Team <ExternalMark />
                </a>
                <a
                  href={MARKETING.book}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Book a meeting — opens causey.dev in a new tab"
                  className="hidden items-center gap-1.5 rounded-lg border border-line bg-white px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-red/40 hover:text-brand-red sm:inline-flex"
                >
                  Book a meeting <ExternalMark />
                </a>
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
              <a
                href="https://causey.dev"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="causey.dev — opens in a new tab"
                className="font-medium text-muted-strong transition-colors hover:text-brand-red"
              >
                causey.dev <ExternalMark />
              </a>
              <Link
                href="/pathways"
                className="font-medium text-muted-strong transition-colors hover:text-brand-red"
              >
                Qualification pathways
              </Link>
              <p className="text-muted">© {new Date().getFullYear()} Causey</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
