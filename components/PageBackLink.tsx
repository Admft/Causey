import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Public-page escape to a named destination. Compact outline control
 * (design system §8.4), not a ghost text arrow. Search, clubs, districts,
 * account/legal, and in-flow step-backs reuse it so the affordance is one
 * control everywhere.
 */
function BackChevron() {
  return (
    <svg
      className="page-back-mark"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M10 3.5 5.5 8 10 12.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PageBackLink({
  href = "/",
  children = "All competition types",
}: {
  href?: string;
  children?: ReactNode;
}) {
  return (
    <Link href={href} className="page-back">
      <BackChevron />
      {children}
    </Link>
  );
}

export function PageBackButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="page-back"
      onClick={onClick}
      disabled={disabled}
    >
      <BackChevron />
      {children}
    </button>
  );
}

export function PageNextButton({
  onClick,
  children,
  disabled,
}: {
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="page-back"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      <svg
        className="page-back-mark"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <path
          d="M6 3.5 10.5 8 6 12.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
