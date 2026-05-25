'use client';
import React from 'react';
import { motion } from 'framer-motion';
import type { Tab } from '../types';
import { NAV_GROUPS } from '../nav-config';
import { useNetwork } from '@/context/network-context';

// ── Official Bitstream Logo Mark (inline) ──────────────────
function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="4,4 60,4 60,44 20,60 4,60" fill="#F7931A" />
      <rect x="13" y="13" width="22" height="22" rx="3" fill="#0b0b0b" />
    </svg>
  );
}

const TAG_STYLES: Record<string, string> = {
  LIVE:   'bg-[rgba(34,197,94,0.10)]  text-[#22c55e] border-[rgba(34,197,94,0.24)]',
  YIELD:  'bg-[rgba(0,212,170,0.10)]  text-[#00d4aa] border-[rgba(0,212,170,0.24)]',
  X402:   'bg-[rgba(139,92,246,0.10)] text-[#a78bfa] border-[rgba(139,92,246,0.24)]',
  AGENT:  'bg-[rgba(247,147,26,0.10)]   text-[#F7931A] border-[rgba(247,147,26,0.24)]',
};

const sidebarVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03, delayChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: {
    opacity: 1, x: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
  },
};

interface Props {
  tab: Tab;
  onNavigate: (t: Tab) => void;
  backendOnline: boolean | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function Sidebar({ tab, onNavigate, backendOnline, isLoading, onRefresh }: Props) {
  const { network } = useNetwork();

  return (
    <aside
      className="hidden lg:flex flex-col w-[272px] shrink-0 min-h-screen sticky top-0"
      style={{
        background: 'var(--bg-surface)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center gap-3.5 px-6 h-[76px] shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <LogoMark size={36} />
        <div className="min-w-0 leading-none">
          <div
            className="font-extrabold"
            style={{
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              fontSize: '19px',
            }}
          >
            <span style={{ color: 'var(--text-primary)' }}>settle</span>
            <span style={{ color: '#F7931A' }}>mint</span>
          </div>
          <div
            className="font-semibold uppercase"
            style={{
              fontSize: '8.5px',
              letterSpacing: '0.22em',
              marginTop: 6,
              color: '#F7931A',
              opacity: 0.7,
              lineHeight: 1,
            }}
          >
            Bitcoin Cashflow · Mezo
          </div>
        </div>
      </div>

      {/* ── Nav groups ── */}
      <motion.nav
        variants={sidebarVariants}
        initial="hidden"
        animate="show"
        className="flex-1 px-3 py-6 space-y-7 overflow-y-auto"
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-3 label-section">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ id, label, icon: Icon, tag }) => {
                const active = tab === id;
                return (
                  <motion.div key={id} variants={itemVariants}>
                    <button
                      onClick={() => onNavigate(id)}
                      className={`nav-item w-full text-left ${active ? 'active' : ''}`}
                    >
                      {active && (
                        <motion.div
                          layoutId="sidebar-active-bg"
                          className="absolute inset-0 rounded-[var(--r-md)]"
                          style={{
                            background: 'rgba(247,147,26,0.08)',
                            border: '1px solid rgba(247,147,26,0.18)',
                          }}
                          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                        />
                      )}
                      {active && (
                        <span
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                          style={{
                            background: 'linear-gradient(180deg, #F7931A, #F7931A)',
                            boxShadow: '0 0 10px rgba(247,147,26,0.7)',
                          }}
                        />
                      )}
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {React.createElement(Icon as any, {
                        className: 'nav-icon relative z-10',
                        color: active ? '#F7931A' : undefined,
                        size: 17,
                      })}
                      <span
                        className="flex-1 relative z-10"
                        style={active ? { color: 'var(--text-primary)', fontWeight: 600 } : undefined}
                      >
                        {label}
                      </span>
                      {tag && (
                        <span className={`relative z-10 chip ${TAG_STYLES[tag] ?? ''}`}
                          style={{ fontSize: '9px', padding: '2px 8px', letterSpacing: '0.08em' }}>
                          {tag}
                        </span>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </motion.nav>

      {/* ── Status footer ── */}
      <div className="px-4 py-5 shrink-0 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Network pill */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg"
          style={{
            background: network === 'testnet' ? 'rgba(139,92,246,0.08)' : 'rgba(247,147,26,0.08)',
            border: `1px solid ${network === 'testnet' ? 'rgba(139,92,246,0.22)' : 'rgba(247,147,26,0.22)'}`,
          }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: network === 'testnet' ? '#8b5cf6' : '#F7931A', boxShadow: `0 0 8px ${network === 'testnet' ? 'rgba(139,92,246,0.8)' : 'rgba(247,147,26,0.8)'}` }}
          />
          <span className="text-[12px] font-semibold flex-1"
            style={{ color: network === 'testnet' ? '#a78bfa' : '#F7931A' }}>
            {network === 'testnet' ? 'Matsnet Testnet' : 'Mezo Mainnet'}
          </span>
        </div>

        {/* Agent status */}
        <div className="flex items-center gap-2.5">
          {backendOnline === true ? (
            <><span className="status-live" /><span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>Agent online</span></>
          ) : backendOnline === false ? (
            <><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /><span className="text-[12.5px]" style={{ color: 'var(--text-tertiary)' }}>Agent offline</span></>
          ) : (
            <><span className="status-idle" /><span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Connecting…</span></>
          )}
          <button
            onClick={onRefresh}
            className="ml-auto btn-icon"
            style={{ width: 28, height: 28 }}
            title="Refresh"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={isLoading ? 'animate-spin' : ''}>
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        </div>

        <p className="text-[10.5px] text-center" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
          Mezo Hackathon 2026 · MUSD Track
        </p>
      </div>
    </aside>
  );
}
