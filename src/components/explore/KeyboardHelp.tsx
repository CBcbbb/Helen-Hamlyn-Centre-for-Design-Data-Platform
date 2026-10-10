'use client';

import { useRef } from 'react';
import { Dialog } from './Dialog';
import { isMacLike } from '@/lib/hooks';
import { CloseIcon } from './icons';

export function KeyboardHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const mod = isMacLike() ? '⌘' : 'Ctrl';
  const shortcuts: [string, string][] = [
    [`${mod} K`, 'Go to search'],
    [`${mod} E`, 'Switch between map and table'],
    ['Tab', 'Move into the map, then out again'],
    ['Arrow keys', 'Move to the nearest entry in that direction (in the map)'],
    ['Enter or Space', 'Open the details of the focused entry'],
    [`${mod} ← →`, 'Make the details panel wider or narrower'],
    ['Escape', 'Close the details panel or this dialog'],
    ['?', 'Show these shortcuts'],
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="shortcuts-title"
      initialFocusRef={closeRef}
      className="anim-sheet m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg bg-paper p-0 text-ink shadow-[0_24px_64px_-16px_rgb(34_33_42/0.35)]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-rule px-6 py-5">
        <h2 id="shortcuts-title" className="heading text-xl">
          Keyboard shortcuts
        </h2>
        <button ref={closeRef} type="button" onClick={onClose} className="icon-btn -mr-2 -mt-1" aria-label="Close keyboard shortcuts">
          <CloseIcon />
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 px-6 py-5 text-[0.9375rem]">
        {shortcuts.map(([key, label]) => (
          <div key={key} className="contents">
            <dt>
              <kbd>{key}</kbd>
            </dt>
            <dd className="text-ink">{label}</dd>
          </div>
        ))}
      </dl>
      <p className="meta border-t border-rule px-6 py-4">
        Shortcuts are switched off while you are typing in the search box, except {mod} K and {mod} E.
      </p>
    </Dialog>
  );
}
