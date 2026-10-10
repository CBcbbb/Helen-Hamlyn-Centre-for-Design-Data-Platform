import type { NodeType } from '@/lib/types';
import { TYPE_META } from '@/lib/types-meta';

/**
 * Each entity type has a shape as well as a colour, so the type is never
 * conveyed by colour alone: people are circles, partners squares, projects
 * diamonds, methods triangles. The same shapes are used in the network map.
 */
export const MARK_PATHS: Record<NodeType, string> = {
  People: 'M5 0.5a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9Z',
  Partners: 'M1 1h8v8H1Z',
  Projects: 'M5 0l5 5l-5 5l-5-5Z',
  Methods: 'M5 0.6l4.8 8.6H0.2Z',
};

export function TypeMark({
  type,
  size = '0.7em',
  className = '',
  label,
}: {
  type: NodeType;
  size?: string;
  className?: string;
  /** Provide a label only when the mark is the sole indicator of type. */
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 10 10"
      width={size}
      height={size}
      className={`type-mark ${className}`}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
    >
      <path d={MARK_PATHS[type]} fill={`var(--color-${TYPE_META[type].token})`} />
    </svg>
  );
}
