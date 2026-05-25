'use client';

interface LogoMarkProps {
  size?: number;
  bg?: string;
}

export function LogoMark({ size = 40 }: LogoMarkProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        background: 'linear-gradient(135deg, #F7931A 0%, #ffaa3c 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#050505',
        fontFamily: 'var(--font-display), system-ui, sans-serif',
        fontWeight: 900,
        fontSize: size * 0.45,
        lineHeight: 1,
        boxShadow: '0 0 20px rgba(247,147,26,0.35)',
      }}
    >
      ₿
    </div>
  );
}

interface LogoWordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  bg?: string;
}

export function LogoWordmark({ size = 'md' }: LogoWordmarkProps) {
  const iconSize = size === 'sm' ? 26 : size === 'lg' ? 48 : 36;
  const textSize = size === 'sm' ? '16px' : size === 'lg' ? '28px' : '20px';
  const subSize  = size === 'sm' ? '8px'  : size === 'lg' ? '11px' : '9px';
  const gap      = size === 'sm' ? 10 : size === 'lg' ? 16 : 12;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <LogoMark size={iconSize} />
      <div style={{ lineHeight: 1 }}>
        <div style={{
          fontSize: textSize,
          fontWeight: 900,
          fontFamily: 'var(--font-display), system-ui, sans-serif',
          letterSpacing: '-0.04em',
          lineHeight: 1,
          background: 'linear-gradient(135deg, #F7931A 0%, #ffaa3c 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          Bitstream
        </div>
        <div style={{
          fontSize: subSize,
          fontWeight: 600,
          letterSpacing: '0.22em',
          marginTop: size === 'sm' ? 4 : 6,
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}>
          Bitcoin Cashflow · Mezo
        </div>
      </div>
    </div>
  );
}
