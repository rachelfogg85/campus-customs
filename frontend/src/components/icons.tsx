/**
 * Small original line-art icons for brand touches (nav mark, feature cards).
 * Deliberately simple mascot-style shapes, not a reproduction of Yale's
 * actual trademarked seal/shield artwork — safe to use as our own mark on a
 * fan-run store rather than implying official affiliation.
 */

export function BulldogIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9 10c-3 0-5 3-4.5 6.5C3 19 4 22 6 23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M23 10c3 0 5 3 4.5 6.5C28 19 27 22 25 23"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <ellipse cx="16" cy="18" rx="9.5" ry="8.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12.5" cy="16" r="1.4" fill="currentColor" />
      <circle cx="19.5" cy="16" r="1.4" fill="currentColor" />
      <path
        d="M13 21.5c0.8 1 1.9 1.5 3 1.5s2.2-0.5 3-1.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M16 18.5v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CartIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 8h3l2.6 14.2a2 2 0 0 0 2 1.6h10.6a2 2 0 0 0 2-1.6L27 12H10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="14" cy="27" r="1.6" fill="currentColor" />
      <circle cx="22" cy="27" r="1.6" fill="currentColor" />
    </svg>
  );
}

export function CampusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="7" y="14" width="18" height="12" stroke="currentColor" strokeWidth="2" />
      <path d="M9 14V9h14v5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 9V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 5h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="14" y="19" width="4" height="7" stroke="currentColor" strokeWidth="2" />
      <path d="M10.5 17.5v3M21.5 17.5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
