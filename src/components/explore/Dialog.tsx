'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * A modal built on the native <dialog> element. showModal() gives us, from
 * the browser: focus moved into the dialog, the rest of the page made inert
 * (so Tab cannot leave it), Escape to close, and a ::backdrop. We add
 * backdrop-click-to-close and focus restoration to the element that was
 * focused before opening.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  className = '',
  children,
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  className?: string;
  children: ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      (initialFocusRef?.current ?? dialog).focus();
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open, initialFocusRef]);

  // Restore focus when closed (by any route: Escape, button, backdrop).
  useEffect(() => {
    if (open) return;
    const el = restoreRef.current;
    restoreRef.current = null;
    if (el && el.isConnected) el.focus();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-modal="true"
      tabIndex={-1}
      className={className}
      onCancel={(e) => {
        e.preventDefault();
        onCloseRef.current();
      }}
      onClick={(e) => {
        // A click on the <dialog> element itself (not its content) is the backdrop.
        if (e.target === e.currentTarget) onCloseRef.current();
      }}
    >
      {open ? children : null}
    </dialog>
  );
}
