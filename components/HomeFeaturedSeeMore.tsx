"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

/**
 * Primary closer for the homepage browse strip. Looks like a normal CTA at
 * rest; one sheen plays when the control first enters the viewport.
 */
export function HomeFeaturedSeeMore({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        el.classList.remove("is-cta-attention");
        void el.offsetWidth;
        el.classList.add("is-cta-attention");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.55 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      ref={ref}
      href={href}
      className="cta-enabled cta-sheen group inline-flex"
    >
      <span className="relative z-10">{label}</span>
      <span aria-hidden="true" className="nudge-x relative z-10">
        →
      </span>
    </Link>
  );
}
