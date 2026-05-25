'use client';
import { useState } from 'react';
import { TrendingUp, ArrowDownRight, ArrowUpRight, Zap, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVault } from '@/hooks/useVault';

const E: [number, number, number, number] = [0.16, 1, 0.3, 1];

const STRATEGIES = [
  {
    id: 'musd-lp',
    name: 'MUSD Liquidity Pool',
    protocol: 'Mezo DEX',
    apy: 6.24,
    tvl: '4.2M',
    allocated: 28000,
    color: 'var(--musd)',
    tag: 'Stable',
    tagColor: 'var(--green)',
    tagBg: 'var(--green-dim)',
    risk: 'Low',
  },
  {
    id: 'btc-yield',
    name: 'BTC Collateral Yield',
    protocol: 'MUSDVault',
    apy: 3.8,
    tvl: '18.4M',
    allocated: 0,
    color: 'var(--btc)',
    tag: 'Auto',
    tagColor: 'var(--btc)',
    tagBg: 'var(--btc-dim)',
    risk: 'Low',
  },
  {
    id: 'mezo-staking',
    name: 'Mezo Native Staking',
    protocol: 'Mezo Protocol',
    apy: 11.2,
    tvl: '31.7M',
    allocated: 0,
    color: '#7c3aed',
    tag: 'Medium risk',
    tagColor: '#7c3aed',
    tagBg: 'rgba(124,58,237,0.08)',
    risk: 'Medium',
  },
];

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: E }}
    >
      {prefix}{value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{suffix}
    </motion.span>
  );
}

export default function YieldPanel() {
  const vault = useVault();
  const [activeStrategy, setActiveStrategy] = useState<string | null>(null);

  const idleMUSD = vault.musdBalance
    ? Math.max(0, parseFloat(vault.musdBalance) - STRATEGIES.reduce((s, st) => s + st.allocated, 0))
    : 31200;

  const totalAllocated = STRATEGIES.reduce((s, st) => s + st.allocated, 0);
  const projectedAnnual = totalAllocated > 0
    ? STRATEGIES.reduce((sum, st) => sum + (st.allocated * st.apy / 100), 0)
    : 0;

  return (
    <div className="space-y-5">
      <div className="mb-5">
        <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.035em' }}>
          Yield Strategies
        </h2>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Route idle MUSD into Mezo-native yield. Auto-unwind before scheduled payments.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Idle MUSD', value: idleMUSD.toLocaleString('en-US', { maximumFractionDigits: 0 }), unit: 'MUSD', color: 'var(--accent)', icon: Zap },
          { label: 'Allocated', value: totalAllocated.toLocaleString('en-US', { maximumFractionDigits: 0 }), unit: 'MUSD', color: 'var(--musd)', icon: Lock },
          { label: 'Projected Annual', value: projectedAnnual.toLocaleString('en-US', { maximumFractionDigits: 0 }), unit: 'MUSD', color: 'var(--green)', icon: TrendingUp },
          { label: 'Best APY', value: '11.2', unit: '%', color: '#7c3aed', icon: ArrowUpRight },
        ].map(({ label, value, unit, color, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.5, ease: E }}
            className="card-base p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 flex items-center justify-center rounded-lg"
                style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
                <Icon style={{ width: 12, height: 12, color }} />
              </div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                {label}
              </p>
            </div>
            <p className="text-[18px] font-bold tabular-nums leading-none"
              style={{ fontFamily: 'var(--font-mono)', color }}>
              {value}
              <span className="text-[11px] font-normal ml-1" style={{ color: 'var(--text-muted)' }}>{unit}</span>
            </p>
          </motion.div>
        ))}
      </div>

      {/* Idle alert */}
      {idleMUSD > 5000 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: E }}
          className="flex items-start gap-3.5 rounded-[16px] p-4"
          style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
        >
          <div className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
            style={{ background: 'rgba(232,23,58,0.1)', border: '1px solid rgba(232,23,58,0.2)' }}>
            <Zap style={{ width: 13, height: 13, color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>
              {idleMUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })} MUSD sitting idle
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Routing to MUSD LP could generate ~{(idleMUSD * 0.0624 / 12).toFixed(0)} MUSD/month. Funds auto-unwind before scheduled payments.
            </p>
          </div>
        </motion.div>
      )}

      {/* Strategy cards */}
      <div className="space-y-3">
        <h3 className="text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Available Strategies</h3>
        {STRATEGIES.map((strategy, i) => (
          <motion.div
            key={strategy.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.45, ease: E }}
            className="card-base p-5 cursor-pointer transition-all"
            style={{
              borderColor: activeStrategy === strategy.id ? `${strategy.color}30` : undefined,
            }}
            onClick={() => setActiveStrategy(v => v === strategy.id ? null : strategy.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 flex items-center justify-center rounded-xl shrink-0"
                  style={{ background: `${strategy.color}10`, border: `1px solid ${strategy.color}20` }}>
                  <TrendingUp style={{ width: 16, height: 16, color: strategy.color }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {strategy.name}
                    </p>
                    <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full"
                      style={{ background: strategy.tagBg, color: strategy.tagColor, border: `1px solid ${strategy.tagColor}20` }}>
                      {strategy.tag}
                    </span>
                  </div>
                  <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {strategy.protocol} · TVL ${strategy.tvl}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 justify-end">
                  <ArrowUpRight style={{ width: 14, height: 14, color: 'var(--green)' }} />
                  <span className="text-[18px] font-bold tabular-nums"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>
                    {strategy.apy}%
                  </span>
                </div>
                <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>APY</p>
              </div>
            </div>

            {/* Allocation bar */}
            {strategy.allocated > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Allocated</span>
                  <span className="text-[12px] font-semibold tabular-nums"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {strategy.allocated.toLocaleString()} MUSD
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-base)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.8, ease: E }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${strategy.color}, ${strategy.color}88)` }}
                  />
                </div>
              </div>
            )}

            {/* Expanded: allocate form placeholder */}
            {activeStrategy === strategy.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: E }}
                className="mt-4 pt-4 overflow-hidden"
                style={{ borderTop: '1px solid var(--border-base)' }}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="Amount in MUSD"
                    className="flex-1 px-3 py-2 rounded-lg text-[13px]"
                    style={{
                      background: 'var(--bg-raised)',
                      border: '1px solid var(--border-base)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                    onClick={e => e.stopPropagation()}
                  />
                  <button
                    className="btn-primary text-[12px]"
                    style={{ padding: '8px 16px' }}
                    onClick={e => e.stopPropagation()}
                  >
                    Allocate
                  </button>
                </div>
                <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  Funds automatically unwind 24h before any scheduled payment.
                </p>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Auto-yield info */}
      <div className="flex items-start gap-3.5 rounded-[16px] p-4 card-base">
        <div className="mt-0.5 w-7 h-7 flex items-center justify-center rounded-lg shrink-0"
          style={{ background: 'var(--green-dim)', border: '1px solid var(--green-border)' }}>
          <ArrowDownRight style={{ width: 13, height: 13, color: 'var(--green)' }} />
        </div>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Auto-unwind before payouts
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Bitstream automatically withdraws from yield strategies 24 hours before any scheduled payment. Your MUSD is always available when needed.
          </p>
        </div>
      </div>
    </div>
  );
}
