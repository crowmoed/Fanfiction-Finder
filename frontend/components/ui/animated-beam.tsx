interface AnimatedBeamProps {
  vertical?: boolean;
}

export function AnimatedBeam({ vertical = false }: AnimatedBeamProps) {
  return (
    <span
      aria-hidden
      className={vertical ? 'h-10 w-px' : 'h-px flex-1'}
      style={{
        display: 'block',
        background: vertical
          ? 'linear-gradient(to bottom, var(--aurora-1), var(--aurora-2))'
          : 'linear-gradient(to right, var(--aurora-1), var(--aurora-2))',
        boxShadow: '0 0 10px rgba(217,119,87,0.35)',
      }}
    />
  );
}
