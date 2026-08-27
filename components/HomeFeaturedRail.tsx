"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Horizontal listing preview. Once the rail is on screen and actually
 * overflows, it peeks the next card then yanks back so the row reads as
 * scrollable. Reduced motion, a short overflow, or a user grab cancel it.
 */
export function HomeFeaturedRail({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    let played = false;
    let delayId = 0;

    const cancel = () => {
      window.clearTimeout(delayId);
      el.removeAttribute("data-hint");
    };

    const play = () => {
      if (played) return;
      if (el.scrollLeft > 2) return;
      const overflow = el.scrollWidth - el.clientWidth;
      if (overflow < 48) return;
      played = true;
      el.style.setProperty(
        "--featured-peek",
        `${Math.min(overflow, 96)}px`
      );
      el.setAttribute("data-hint", "");
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        delayId = window.setTimeout(play, 400);
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.35 }
    );
    observer.observe(el);

    const onAnimEnd = (event: AnimationEvent) => {
      if (event.target === el.firstElementChild) cancel();
    };

    el.addEventListener("pointerdown", cancel, { passive: true });
    el.addEventListener("wheel", cancel, { passive: true });
    el.addEventListener("animationend", onAnimEnd);

    return () => {
      window.clearTimeout(delayId);
      observer.disconnect();
      el.removeEventListener("pointerdown", cancel);
      el.removeEventListener("wheel", cancel);
      el.removeEventListener("animationend", onAnimEnd);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="home-featured-rail soft-scroll mt-8 snap-x snap-mandatory overflow-x-auto overscroll-x-contain py-3"
    >
      {children}
    </div>
  );
}
