"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns a ref and a boolean. When the referenced element enters
 * the viewport it flips `visible` to true (once).
 *
 * Usage:
 *   const [ref, visible] = useFadeIn();
 *   <section ref={ref} className={visible ? "animate-fade-in-up" : "opacity-0"}>
 */
export function useFadeIn<T extends HTMLElement = HTMLDivElement>(
  threshold = 0.15,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, visible];
}
