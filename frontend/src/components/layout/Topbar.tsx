'use client';
import { Menu } from 'lucide-react';
import NetworkToggle from '@/components/NetworkToggle';
import WalletConnect from '@/components/WalletConnect';
import ThemeToggle from '@/components/ThemeToggle';
import type { Tab } from '../types';

// ── Official Bitstream Logo Mark (inline) ──────────────────
function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="4,4 60,4 60,44 20,60 4,60" fill="#F7931A" />
      <rect x="13" y="13" width="22" height="22" rx="3" fill="#0b0b0b" />
    </svg>
  );
}

const PAGE_META: Record<string, { title: string; sub?: string }> = {
  dashboard: { title: 'Overview',       sub: 'Treasury snapshot' },
  vault:     { title: 'Vault',          sub: 'BTC collateral · MUSD' },
  create:    { title: 'New Payment',    sub: 'Schedule a recurring MUSD payment' },
  payments:  { title: 'Schedules',      sub: 'Active payment obligations' },
  yield:     { title: 'Yield',          sub: 'Mezo vault strategies' },
  x402:      { title: 'x402 Monitor',  sub: 'Programmable payment activity' },
  agent:     { title: 'Agent',          sub: 'Automation scheduler & execution log' },
};

interface Props {
  tab: Tab;
  onMenuToggle: () => void;
}

export function Topbar({ tab, onMenuToggle }: Props) {
  const meta = PAGE_META[tab] ?? { title: 'Bitstream' };

  return (
    <header
      className="flex items-center justify-between px-6 lg:px-9 h-[72px] sticky top-0 z-40 shrink-0"
      style={{
        background: 'rgba(12,12,12,0.90)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Mobile: hamburger + mini logo */}
        <button onClick={onMenuToggle} className="btn-icon lg:hidden">
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-3 lg:hidden">
          <LogoMark size={28} />
          <span className="font-extrabold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.04em', fontSize: '15px' }}>
            <span style={{ color: "inherit" }}>Bit</span><span style={{ color: '#F7931A' }}>mint</span>
          </span>
        </div>

        {/* Page title — desktop */}
        <div className="hidden lg:block min-w-0">
          <h1 className="font-bold leading-none truncate"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.035em', fontSize: '18px' }}>
            {meta.title}
          </h1>
          {meta.sub && (
            <p className="leading-none mt-1.5 truncate"
              style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
              {meta.sub}
            </p>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:block"><NetworkToggle /></div>
        <div className="w-px h-5 hidden sm:block" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <ThemeToggle />
        <WalletConnect />
      </div>
    </header>
  );
}
