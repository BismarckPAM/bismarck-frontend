/* ============================================================================
 *  PLACEHOLDER LOGO — swap in your own SVG here
 * ============================================================================
 *  A logo SVG is currently being designed. Until it lands, this placeholder
 *  (plum shield + keyhole, gradient #9B0D81 -> #71005F) is used everywhere.
 *
 *  To replace it with the final logo:
 *
 *  1. THIS FILE — replace ONLY the <svg>...</svg> markup inside BismarckMark
 *     below with the new SVG. Rules to keep it drop-in compatible:
 *       - Keep the component signature: BismarckMark({ className })
 *       - Keep  className={cn('h-8 w-8', className)}  on the root <svg>
 *         (this is how every call site controls sizing/coloring)
 *       - Delete any hardcoded width="..." height="..." from the SVG root
 *       - Any viewBox is fine; layout adapts
 *     Used by: Navbar, Footer, and the wordmark below.
 *
 *  2. FAVICON — overwrite  public/favicon.svg  with the same icon
 *     (referenced from index.html).
 *
 *  3. WORDMARK — the "Bismarck" name + "PAM Platform" tagline live in
 *     BismarckLogo below. If the final logo SVG already contains the
 *     company name, delete the <span className="lnd-brand-text"> block
 *     (or render <BismarckMark /> directly at the call sites).
 *
 *  4. The navbar/footer sit on a WHITE background — if the final logo is
 *     dark, that is fine here. If you also want to use it on dark surfaces
 *     add a `variant` prop rather than hardcoding colors.
 * ==========================================================================*/

import { cn } from '@/lib/cn';

export function BismarckMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-8', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="bismarck-grad"
          x1="4"
          y1="2"
          x2="36"
          y2="38"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#9B0D81" />
          <stop offset="1" stopColor="#71005F" />
        </linearGradient>
      </defs>
      <path
        d="M20 2.5L34.5 8V19.5C34.5 28.2 28.6 34.9 20 37.5C11.4 34.9 5.5 28.2 5.5 19.5V8L20 2.5Z"
        fill="url(#bismarck-grad)"
      />
      <path
        d="M20 5.8L31.5 10.2V19.5C31.5 26.5 26.9 32 20 34.2C13.1 32 8.5 26.5 8.5 19.5V10.2L20 5.8Z"
        fill="url(#bismarck-grad)"
        fillOpacity="0.45"
        stroke="#FDF2FA"
        strokeOpacity="0.45"
        strokeWidth="1"
      />
      <circle cx="20" cy="17" r="3.2" fill="#FDF2FA" />
      <path
        d="M18.2 19L17.2 25.5C17.1 26.1 17.5 26.5 18 26.5H22C22.5 26.5 22.9 26.1 22.8 25.5L21.8 19H18.2Z"
        fill="#FDF2FA"
      />
    </svg>
  );
}

export function BismarckLogo({
  className,
  markClassName,
  compact = false,
}: {
  className?: string;
  markClassName?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn('lnd-brand', className)}>
      <BismarckMark className={markClassName} />
      {!compact && (
        <span className="lnd-brand-text">
          <span className="lnd-brand-name">Bismarck</span>
          <span className="lnd-brand-tag">PAM Platform</span>
        </span>
      )}
    </span>
  );
}
