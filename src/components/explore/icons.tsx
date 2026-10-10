/** Small inline icons. Decorative: the controls that use them carry a label. */
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: 'false' as const,
};

export const CloseIcon = () => (
  <svg {...base}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
);
export const PlusIcon = () => (
  <svg {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const MinusIcon = () => (
  <svg {...base}>
    <path d="M5 12h14" />
  </svg>
);
export const FitIcon = () => (
  <svg {...base}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);
export const ArrowLeftIcon = () => (
  <svg {...base}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);
export const ConstellationIcon = () => (
  <svg {...base}>
    <circle cx="6" cy="7" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="17" cy="5" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="13" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="5" cy="18" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="19" cy="17" r="1.6" fill="currentColor" stroke="none" />
    <path d="M6 7l6 6M17 5l-5 8M12 13l-7 5M12 13l7 4" strokeWidth="1.25" />
  </svg>
);
export const ColumnsIcon = () => (
  <svg {...base}>
    <circle cx="5" cy="6" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="5" cy="18" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="9" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="19" cy="6" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="19" cy="18" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);
export const GuideIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6" />
    <circle cx="12" cy="16.9" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);
export const ExpandIcon = () => (
  <svg {...base}>
    <path d="M6 15l6-6 6 6" />
  </svg>
);
export const CollapseIcon = () => (
  <svg {...base}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
