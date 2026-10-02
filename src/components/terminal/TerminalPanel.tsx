import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import {
  openJitTerminal,
  isTerminalSupported,
  type TerminalConnection,
} from '../../api/jitTerminal';

export interface TerminalPanelProps {
  /** The `TemporaryPermission` id — this is the session the broker is bound to. */
  permissionId: string;
  /** SSH login the broker will use, shown in the header so it is never a mystery. */
  login?: string | null;
  /** Shown while connecting and when the session ends. */
  label?: string;
}

/** Fits the PTY to its container and reports the new geometry upstream. */
function useFitter(
  termRef: React.RefObject<Terminal | null>,
  fitRef: React.RefObject<FitAddon | null>,
  connectionRef: React.MutableRefObject<TerminalConnection | null>,
) {
  return useCallback(() => {
    const term = termRef.current;
    const fit = fitRef.current;
    if (!term || !fit) return;
    try {
      fit.fit();
      connectionRef.current?.resize(term.cols, term.rows);
    } catch {
      // fit() throws when the container is 0x0 (hidden tab). Harmless.
    }
  }, [termRef, fitRef, connectionRef]);
}

/**
 * Brokered JIT terminal.
 *
 * Renders an xterm.js view wired to the Authorization Service's WebSocket. All
 * SSH lives server-side: this component sends keystrokes and paints whatever the
 * remote shell emits. When the JIT session expires or is revoked the server tears
 * the SSH channel down, the socket closes, and the shell dies with it — the user
 * cannot outlive their grant.
 */
export const TerminalPanel: React.FC<TerminalPanelProps> = ({ permissionId, login, label }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const connectionRef = useRef<TerminalConnection | null>(null);
  // Written by the socket callbacks, which must not re-run on every render.
  const sendRef = useRef<(data: string) => void>(() => undefined);

  const [phase, setPhase] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const [status, setStatus] = useState('Connecting to the broker…');

  const refit = useFitter(termRef, fitRef, connectionRef);

  // Create the terminal, open the socket, and tear both down on unmount.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !isTerminalSupported()) return;

    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      theme: { background: '#10182a', foreground: '#d7e2ff' },
      scrollback: 5000,
    });

    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);

    // Fit before connecting so the first frame is the right width, then again
    // after the socket opens in case the layout settled differently.
    try {
      fit.fit();
    } catch {
      // 0x0 host; the ResizeObserver below corrects it.
    }

    termRef.current = term;
    fitRef.current = fit;

    const connection = openJitTerminal(permissionId, term.cols, term.rows, {
      onOutput: (data) => term.write(data),
      onOpen: () => {
        setPhase('open');
        setStatus('');
        try {
          fit.fit();
        } catch {
          // ignore
        }
        connectionRef.current?.resize(term.cols, term.rows);
        term.focus();
      },
      onClose: (message) => {
        setPhase('closed');
        setStatus(message);
        // Leave the final frame on screen so the user sees where it ended.
        term.write(`\r\n\x1b[33m${message}\x1b[0m\r\n`);
      },
    });

    connectionRef.current = connection;
    sendRef.current = (data: string) => connection?.send(data);

    if (!connection) {
      setPhase('closed');
    }

    // Keystrokes go straight upstream. encodeURIComponent-style escaping is not
    // needed: the frame is JSON.stringify'd, so control characters survive.
    const inputDisposable = term.onData((data) => sendRef.current(data));

    const observer = new ResizeObserver(() => refit());
    observer.observe(host);

    return () => {
      observer.disconnect();
      inputDisposable.dispose();
      connection?.close();
      connectionRef.current = null;
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [permissionId, refit]);

  return (
    <div className="wf-terminal">
      <div className="wf-terminal-head">
        <span className="wf-terminal-title">{label || 'Terminal'}</span>
        {login && <span className="wf-terminal-login">ssh {login}</span>}
        <span
          className={`wf-terminal-state wf-terminal-state-${phase}`}
          role="status"
          aria-live="polite"
        >
          {phase === 'open' ? 'Connected' : phase === 'connecting' ? 'Connecting…' : 'Disconnected'}
        </span>
      </div>

      {status && phase !== 'open' && (
        <p className="wf-terminal-status" role="alert">
          {status}
        </p>
      )}

      <div
        className="wf-terminal-screen"
        ref={hostRef}
        onClick={() => termRef.current?.focus()}
        // The remote shell is the accessible surface; expose it as a region so
        // screen readers announce the panel rather than skipping it.
        role="group"
        aria-label={`Terminal session${label ? ` for ${label}` : ''}`}
      />
    </div>
  );
};

export default TerminalPanel;
