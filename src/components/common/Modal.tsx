import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible modal dialog:
 *  - role="dialog" + aria-modal + labelled by its title
 *  - Escape closes
 *  - Focus moves into the dialog on open and is restored on close
 *  - Clicking the backdrop closes
 */
export const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ title, onClose, children, footer }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = 'wf-modal-title';

  // Keep the latest onClose without making it a dependency of the focus effect:
  // an inline onClose changes identity on every parent render, which would
  // otherwise re-run the effect and steal focus back out of any input.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <div className="wf-modal-backdrop" onMouseDown={onClose}>
      <div
        className="wf-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={dialogRef}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="wf-modal-header">
          <h2 id={titleId} className="wf-modal-title">
            {title}
          </h2>
          <button type="button" className="wf-icon-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="wf-modal-body">{children}</div>
        {footer && <div className="wf-modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
