"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Primary nav destinations available to everyone, signed in or out.
 * Chess search is the one working surface today — it stays one tap
 * away in the header, with an active state on chess surfaces.
 */
const CHESS_PREFIXES = ["/chess", "/event", "/pathways"];

export function PrimaryNav() {
  const pathname = usePathname();
  const chessActive = CHESS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  return (
    <Link
      href="/chess"
      aria-current={chessActive ? "page" : undefined}
      className={
        chessActive
          ? "shrink-0 whitespace-nowrap text-sm font-semibold text-brand-red"
          : "shrink-0 whitespace-nowrap text-sm font-medium text-muted-strong transition-colors hover:text-foreground"
      }
    >
      <span className="sm:hidden">Chess</span>
      <span className="hidden sm:inline">Chess tournaments</span>
    </Link>
  );
}
