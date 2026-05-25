'use client';
import { useState } from 'react';
import { Zap, Globe, CheckCircle2, XCircle, ExternalLink, BarChart3, TrendingUp, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ExecutionLogEntry, PaymentStats } from '@/lib/api';
import { formatMUSD, shortenAddress } from '@/lib/api';

const E: [number, number, number, number] = [0.16, 1, 0.3, 1];
const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://explorer.matsnet.mezo.org';

interface Props {
  log: ExecutionLogEntry[];
  stats: PaymentStats | null;
}

export default function X402Monitor({ log, stats }: Props) {
  const [filter, setFilter] = useState<'all' | 'x402' | 'wallet'>('all');

  const x402Log = log.filter(e => e.type === 'x402');
  const filtered = filter === 'all' ? log : log.filter(e => e.type === filter);

  // Top endpoints by spend
  const endpointSpend = Object.entries(stats?.x402Spending ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const x402Success = x402Log.filter(e => e.success).length;
  const x402Rate = x402Log.length > 0 ? Math.round((x402Success / x402Log.length) * 100) : 0;
  const x402Total = stats?.x402Payments ?? 0;
  const walletTotal = stats?.walletPayments ?? 0;

  return (
    <div className="space-y-5">
      <div className="mb-5">
        <h2 className="text-[18px] font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.035em' }}>
          x402 Monitor
        </h2>
        <p className="text-[13px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          Real-time HTTP 402 payment activity · MUSD pay-per-request execution
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'x402 Payments', value: x402Total, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', icon: Zap },
          { label: 'Wallet Payments', value: walletTotal, color: 'var(--btc)', bg: 'var(--btc-dim)', icon: Activity },
          { label: 'Success Rate', value: `${x402Rate}%`, color: 'var(--green)', bg: 'var(--green-dim)', icon: TrendingUp },
          { label: 'Total MUSD Sent', value: stats ? formatMUSD(stats.totalMUSD) : '—', color: 'var(--accent)', bg: 'var(--accent-dim)', icon: BarChart3 },
        ].map(({ label, value, color, bg, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: E }}
            className="card-base p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 flex items-center justify-center rounded-lg"
                style={{ background: bg, border: `1px solid ${color}20` }}>
                <Icon style={{ width: 12, height: 12, color }} />
              </div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--text-muted)' }}>
                {label}
              </p>
            </div>
            <p className="text-[20px] font-bold tabular-nums leading-none"
              style={{ fontFamily: 'var(--font-mono)', color }}>
              {value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Top endpoints */}
      {endpointSpend.length > 0 && (
        <div className="card-base p-5">
          <h3 className="text-[13.5px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Top x402 Endpoints
          </h3>
          <div className="space-y-3">
            {endpointSpend.map(([endpoint, amount], i) => {
              const maxAmount = endpointSpend[0][1];
              const pct = Math.round((amount / maxAmount) * 100);
              return (
                <div key={endpoint}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe style={{ width: 11, height: 11, color: '#7c3aed', flexShrink: 0 }} />
                      <span className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>
                        {endpoint.length > 40 ? endpoint.slice(0, 40) + '…' : endpoint}
                      </span>
                    </div>
                    <span className="text-[12px] font-semibold tabular-nums ml-3 shrink-0"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {formatMUSD(amount)} MUSD
                    </span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-base)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.7, ease: E, delay: i * 0.06 }}
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #7c3aed, rgba(124,58,237,0.5))' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity log */}
      <div className="card-base p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Payment Activity
          </h3>
          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl"
            style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-base)' }}>
            {(['all', 'x402', 'wallet'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="relative px-3 py-1 rounded-lg text-[11px] font-semibold transition-all capitalize"
                style={{ color: filter === f ? (f === 'x402' ? '#7c3aed' : f === 'wallet' ? 'var(--btc)' : 'var(--text-primary)') : 'var(--text-muted)' }}
              >
                {filter === f && (
                  <motion.div
                    layoutId="x402-filter-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: f === 'x402' ? 'rgba(124,58,237,0.08)' : f === 'wallet' ? 'var(--btc-dim)' : 'var(--bg-surface)',
                      border: `1px solid ${f === 'x402' ? 'rgba(124,58,237,0.2)' : f === 'wallet' ? 'var(--btc-border)' : 'var(--border-base)'}`,
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                  />
                )}
                <span className="relative z-10">{f}</span>
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl mb-3"
              style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.14)' }}>
              <Zap style={{ width: 16, height: 16, color: '#7c3aed' }} />
            </div>
            <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No payment activity yet.</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--text-muted)' }}>Trigger the scheduler to see executions.</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            <AnimatePresence>
              {filtered.map((entry, i) => (
                <motion.div
                  key={`${entry.timestamp}-${i}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.28, ease: E }}
                  className="flex items-center gap-3 px-4 py-3 rounded-[12px]"
                  style={{
                    background: entry.success ? 'rgba(22,163,74,0.04)' : 'rgba(232,23,58,0.04)',
                    border: `1px solid ${entry.success ? 'rgba(22,163,74,0.12)' : 'rgba(232,23,58,0.12)'}`,
                  }}
                >
                  {entry.success
                    ? <CheckCircle2 style={{ width: 14, height: 14, color: 'var(--green)', flexShrink: 0 }} />
                    : <XCircle style={{ width: 14, height: 14, color: 'var(--accent)', flexShrink: 0 }} />}

                  <div className="flex items-center gap-2 shrink-0">
                    {entry.type === 'x402'
                      ? <Globe style={{ width: 11, height: 11, color: '#7c3aed' }} />
                      : <Activity style={{ width: 11, height: 11, color: 'var(--btc)' }} />}
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full"
                      style={{
                        background: entry.type === 'x402' ? 'rgba(124,58,237,0.08)' : 'var(--btc-dim)',
                        color: entry.type === 'x402' ? '#7c3aed' : 'var(--btc)',
                        border: `1px solid ${entry.type === 'x402' ? 'rgba(124,58,237,0.18)' : 'var(--btc-border)'}`,
                      }}>
                      {entry.type}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold tabular-nums"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {formatMUSD(entry.amount)} MUSD
                      </span>
                    </div>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {entry.error
                        ? entry.error
                        : entry.x402Result?.endpoint
                          ? entry.x402Result.endpoint
                          : entry.txHash
                            ? `tx: ${shortenAddress(entry.txHash)}`
                            : 'Success'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {entry.txHash && (
                      <a
                        href={`${EXPLORER_URL}/tx/${entry.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-[10px] mt-0.5 transition-opacity hover:opacity-100"
                        style={{ color: 'var(--btc)', opacity: 0.7 }}
                      >
                        <ExternalLink style={{ width: 9, height: 9 }} />
                        View
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* x402 protocol info */}
      <div className="card-base p-5">
        <div className="flex items-start gap-3.5">
          <div className="w-8 h-8 flex items-center justify-center rounded-xl shrink-0"
            style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.16)' }}>
            <Globe style={{ width: 15, height: 15, color: '#7c3aed' }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              How x402 works
            </p>
            <p className="text-[12px] mt-1 leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>
              The agent intercepts HTTP 402 Payment Required responses from API endpoints. It automatically pays the required MUSD amount and retries the request — enabling AI agents and automated systems to pay their own API bills without manual intervention.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
