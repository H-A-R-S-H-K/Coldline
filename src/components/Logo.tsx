/** App icon artwork, rendered to PNG by next/og for the PWA manifest and iOS. */
export function Logo({ size }: { size: number }) {
  const s = size * 0.55;
  return (
    <div style={{ width: size, height: size, background: "#1f5ad6", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={s} height={s} viewBox="0 0 64 64" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 8v48M11 20l42 24M11 44l42-24M25 12l7 6 7-6M25 52l7-6 7 6" />
      </svg>
    </div>
  );
}
