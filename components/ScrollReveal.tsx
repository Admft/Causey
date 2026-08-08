"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * The site's ONE shared scroll-reveal pattern (anti-vibecode §5.2): a 12px
 * rise + fade, fired once when the element enters the viewport. Use `delay`
 * only for small related groups that should read as a sequence (40-80ms
 * steps). The pending state is set pre-paint and only when motion is allowed,
 * so no-JS and reduced-motion users see the final content instantly.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function ScrollReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.setAttribute("data-pending", "");
    if (delay > 0) {
      el.style.setProperty("--reveal-delay", `${delay}ms`);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute("data-revealed", "");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -20% 0px", threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`scroll-reveal ${className}`}>
      {children}
    </div>
  );
}
