import { useEffect, useRef } from 'react';

/**
 * Scroll-reveal hook: attaches an IntersectionObserver that adds the
 * `is-visible` class once the element enters the viewport (one-shot).
 *
 * Usage:
 *   const ref = useReveal<HTMLDivElement>();
 *   <div ref={ref} className="lnd-reveal" style={{ ['--lnd-reveal-delay' as string]: '120ms' }}>
 *
 * Respects prefers-reduced-motion via CSS (elements are always visible there).
 */
export function useReveal<T extends HTMLElement>(margin = '-80px') {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: margin, threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
