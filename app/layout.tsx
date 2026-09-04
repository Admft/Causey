import type { Metadata, Viewport } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";
import Link from "next/link";
import { CauseyLogo } from "@/components/CauseyLogo";
import { SiteHeader } from "@/components/SiteHeader";
import { DISCOVERY_CATEGORIES } from "@/lib/category-discovery";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-source",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://app.causey.dev"),
  title: {
    default: "Causey — Find student competitions",
    template: "%s · Causey",
  },
  description:
    "Search a growing, incomplete index of student competitions across chess, speech and debate, STEM, arts, and writing, then coordinate invitations and attendance with your organization.",
  openGraph: {
    type: "website",
    siteName: "Causey",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export const viewport: Viewport = { viewportFit: "cover" };

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
      <body className="flex min-h-screen flex-col overflow-x-clip font-medium">
        <a href="#main" className="skip-link sr-only focus:not-sr-only">
          Skip to content
        </a>
        <div className="sticky top-0 z-50" data-site-chrome>
          <SiteHeader />
        </div>

        <main id="main" className="flex-1">
          {children}
        </main>

        <footer className="band-join band-join--surface bg-surface py-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 sm:flex-row sm:items-start sm:justify-between sm:px-8">
            <div className="flex flex-col gap-2">
              <CauseyLogo size="sm" />
              <p className="max-w-sm text-xs text-muted">
                Causey is an early build. Chess search is usable; speech and
                debate, STEM, arts, and writing use only a few official sources.
                Fees, venues, dates, and coverage can be missing or wrong.
                Confirm public details on the organizer&rsquo;s site.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              {DISCOVERY_CATEGORIES.map((category) => (
                <Link
                  key={category.id}
                  href={category.href}
                  className="font-medium text-muted-strong transition-colors hover:text-brand-red"
                >
                  {category.label} tournaments
                </Link>
              ))}
              <Link
                href="/pathways"
                className="font-medium text-muted-strong transition-colors hover:text-brand-red"
              >
                Chess qualification pathways
              </Link>
              <Link
                href="/clubs"
                className="font-medium text-muted-strong transition-colors hover:text-brand-red"
              >
                Clubs and teams
              </Link>
              <Link
                href="/districts"
                className="font-medium text-muted-strong transition-colors hover:text-brand-red"
              >
                Schools and districts
              </Link>
              <nav
                aria-label="Legal"
                className="flex flex-col gap-2"
              >
                <Link
                  href="/privacy"
                  className="font-medium text-muted-strong transition-colors hover:text-brand-red"
                >
                  Privacy and student data
                </Link>
                <Link
                  href="/terms"
                  className="font-medium text-muted-strong transition-colors hover:text-brand-red"
                >
                  Terms of use
                </Link>
              </nav>
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
