export function BrandLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden focusable="false">
      <g fill="currentColor" opacity=".9">
        <rect x="10" y="34" width="6" height="18" rx="3" />
        <rect x="16" y="38" width="31" height="10" rx="4" />
        <rect x="47" y="34" width="7" height="18" rx="3" />
      </g>
      <path d="M17 32 27 22l9 7 13-15" fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m41 14 9-1-1 9" fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
