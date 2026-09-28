import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Cloudflare Turnstile integration.
 *
 * Loads the Turnstile script once per page, renders the widget into the
 * caller-supplied container ref, and exposes the verification token. The token
 * is single-use and short-lived, so `reset()` re-arms the widget after a failed
 * submission or an expiry.
 *
 * The container ref is passed IN (rather than returned) so the hook's result
 * carries only plain state — accessing a ref during render is disallowed by the
 * React hooks lint rules.
 *
 * When no `VITE_TURNSTILE_SITEKEY` is configured, `isConfigured` is false and
 * the caller should show a development notice instead of the widget. The
 * backend remains fail-closed: it verifies the token server-side.
 */

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SCRIPT_ID = 'cf-turnstile-script';

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'error-callback'?: () => void;
      'expired-callback'?: () => void;
      theme?: 'light' | 'dark' | 'auto';
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function loadScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed')));
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile script failed'));
    document.head.appendChild(script);
  });
}

export interface UseTurnstileResult {
  token: string | null;
  /** True when a site key is configured and the widget can render. */
  isConfigured: boolean;
  /** Re-arm the widget after a failed submission or token expiry. */
  reset: () => void;
}

export function useTurnstile(
  sitekey: string | undefined,
  containerRef: RefObject<HTMLDivElement | null>,
): UseTurnstileResult {
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const isConfigured = Boolean(sitekey && sitekey.trim());

  useEffect(() => {
    if (!isConfigured) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (!cancelled) setScriptReady(true);
      })
      .catch(() => {
        /* Fail soft: the form still renders; backend verification is authoritative. */
      });
    return () => {
      cancelled = true;
    };
  }, [isConfigured]);

  useEffect(() => {
    if (!isConfigured || !scriptReady) return;
    const container = containerRef.current;
    const turnstile = window.turnstile;
    if (!container || !turnstile || widgetIdRef.current) return;

    widgetIdRef.current = turnstile.render(container, {
      sitekey: sitekey as string,
      theme: 'auto',
      callback: (value: string) => setToken(value),
      'expired-callback': () => setToken(null),
      'error-callback': () => setToken(null),
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [isConfigured, scriptReady, sitekey, containerRef]);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, []);

  return { token, isConfigured, reset };
}
