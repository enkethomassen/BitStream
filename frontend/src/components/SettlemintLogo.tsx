'use client';

interface LogoMarkProps {
  size?: number;
  bg?: string;
}

export function LogoMark({ size = 40, bg = '#0c0c0c' }: LogoMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="4,4 60,4 60,44 20,60 4,60" fill="#F7931A" />
      <rect x="13" y="13" width="22" height="22" rx="3" fill={bg} />
    </svg>
  );
}

interface LogoWordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  bg?: string;
}

export function LogoWordmark({ size = 'md', bg = '#0c0c0c' }: LogoWordmarkProps) {
  const iconSize = size === 'sm' ? 26 : size === 'lg' ? 48 : 36;
  const textSize = size === 'sm' ? '16px' : size === 'lg' ? '28px' : '20px';
  const subSize  = size === 'sm' ? '8px'  : size === 'lg' ? '11px' : '9px';
  const gap      = size === 'sm' ? 10 : size === 'lg' ? 16 : 12;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      <LogoMark size={iconSize} bg={bg} />
      <div style={{ lineHeight: 1 }}>
        <div style={{
          fontSize: textSize, fontWeight: 800,
          fontFamily: 'Syne, system-ui, sans-serif',
          letterSpacing: '-0.04em', lineHeight: 1,
        }}>
          <span style={{ color: '#f5f5f5' }}>settle</span>
          <span style={{ color: '#F7931A' }}>mint</span>
        </div>
        <div style={{
          fontSize: subSize, fontWeight: 600, letterSpacing: '0.22em',
          marginTop: size === 'sm' ? 4 : 6, textTransform: 'uppercase',
          color: '#F7931A', opacity: 0.75,
        }}>
          Bitcoin Cashflow · Mezo
        </div>
      </div>
    </div>
  );
}
