'use client';

import { useId, type CSSProperties, type ReactNode } from 'react';

export const GUIDE_STEPS = 4;

/**
 * One card of the first-visit guide. Not a dialog: it never takes focus or
 * blocks the page. It sits in the reading order just before what it points
 * at, so keyboard and screen reader users meet it in context, and it can
 * always be dismissed.
 */
export function GuideCard({
  step,
  title,
  children,
  primary,
  onSkip,
  skipLabel = 'Skip the guide',
  caret,
  className = '',
  style,
}: {
  step: number;
  title: ReactNode;
  children: ReactNode;
  primary?: { label: string; onClick: () => void };
  onSkip: () => void;
  skipLabel?: string;
  caret?: 'top' | 'bottom' | 'top-right';
  className?: string;
  style?: CSSProperties;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-body`}
      className={`guide-card anim-guide rounded-lg bg-ink p-4 text-paper shadow-[0_18px_48px_-16px_rgb(34_33_42/0.55)] ${className}`}
      style={style}
      data-caret={caret}
    >
      <p className="meta mb-1.5 text-paper/75!">
        <span className="sr-only">Guide, </span>
        {step} of {GUIDE_STEPS}
      </p>
      <p id={`${id}-title`} className="heading text-[1.0625rem] leading-snug">
        {title}
      </p>
      <p id={`${id}-body`} className="mt-1.5 text-[0.9375rem] leading-snug text-paper/90">
        {children}
      </p>
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        {primary && (
          <button type="button" onClick={primary.onClick} className="guide-btn guide-btn-primary">
            {primary.label}
          </button>
        )}
        <button type="button" onClick={onSkip} className="guide-btn">
          {skipLabel}
        </button>
      </div>
    </section>
  );
}
