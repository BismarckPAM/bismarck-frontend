import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * jsdom implements neither ResizeObserver nor layout. Recharts' ResponsiveContainer
 * measures its parent through ResizeObserver, so without a stub the analytics
 * charts render nothing (and warn about a 0x0 box) in tests.
 *
 * This stub reports one fixed, deterministic size on `observe`, which lets the
 * real chart components mount and render their SVG exactly as they do in a
 * browser. It is test-only: production code is untouched and the genuine
 * browser ResizeObserver still runs in the application. Tests deliberately
 * assert on the accessible containers and their text equivalents rather than on
 * SVG geometry, so they stay robust either way.
 */
const STUB_WIDTH = 800;
const STUB_HEIGHT = 400;

class ResizeObserverStub {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element): void {
    const rect = {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: STUB_WIDTH,
      bottom: STUB_HEIGHT,
      width: STUB_WIDTH,
      height: STUB_HEIGHT,
      toJSON: () => ({}),
    };
    this.callback(
      [
        {
          target,
          contentRect: rect,
          borderBoxSize: [rect],
          contentBoxSize: [rect],
          devicePixelContentBoxSize: [rect],
        } as unknown as ResizeObserverEntry,
      ],
      this as unknown as ResizeObserver,
    );
  }

  unobserve(): void {}

  disconnect(): void {}
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// Runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});
