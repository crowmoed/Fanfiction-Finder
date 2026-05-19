import { AuroraText } from '@/components/ui/aurora-text';

export function HeroTitle() {
  return (
    <h1
      className="font-display italic leading-none tracking-tight"
      style={{ fontSize: 'clamp(48px, 8vw, 96px)', color: 'var(--text-primary)' }}
    >
      <AuroraText
        colors={[
          'var(--aurora-1)',
          'var(--aurora-2)',
          'var(--aurora-3)',
          'var(--aurora-4)',
        ]}
      >
        Fanfic
      </AuroraText>{' '}
      Finder
    </h1>
  );
}
