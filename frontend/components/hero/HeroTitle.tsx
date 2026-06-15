export function HeroTitle() {
  return (
    <h1
      className="font-display italic leading-none tracking-tight"
      style={{ fontSize: 'clamp(48px, 8vw, 96px)', color: 'var(--text-primary)' }}
    >
      <span style={{ color: 'var(--accent)' }}>Semantic</span> Archive
    </h1>
  );
}
