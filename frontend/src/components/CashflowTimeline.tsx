'use client';
import { motion } from 'framer-motion';
import { Calendar, Zap, Wallet, ChevronRight } from 'lucide-react';
import type { PaymentData } from '@/lib/api';
import { formatMUSD, formatInterval } from '@/lib/api';

const E: [number, number, number, number] = [0.16, 1, 0.3, 1];

function getNextExecution(payment: PaymentData): Date {
  if (payment.nextExecution) {
    const d = new Date(payment.nextExecution);
    if (!isNaN(d.getTime())) return d;
  }
  const last = payment.lastExecuted ? payment.lastExecuted * 1000 : Date.now();
  return new Date(last + payment.interval * 1000);
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

function urgencyColor(days: number): string {
  if (days <= 1)  return 'var(--accent)';
  if (days <= 3)  return '#d97706';
  if (days <= 7)  return 'var(--btc)';
  return 'var(--green)';
}

function urgencyBg(days: number): string {
  if (days <= 1)  return 'var(--accent-dim)';
  if (days <= 3)  return 'rgba(217,119,6,0.08)';
  if (days <= 7)  return 'var(--btc-dim)';
  return 'var(--green-dim)';
}

interface Props {
  payments: PaymentData[];
}

export default function CashflowTimeline({ payments }: Props) {
  const active = payments
    .filter(p => p.isActive)
    .map(p => ({ ...p, nextDate: getNextExecution(p) }))
    .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())
    .slice(0, 6);

  const totalUpcoming7d = active
    .filter(p => daysUntil(p.nextDate) <= 7)
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  if (!active.length) {
    return (
      <div className="card-base p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <Calendar className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Cashflow Timeline
          </h3>
        </div>
        <div className="py-8 text-center">
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>No active payment schedules.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Cashflow Timeline
          </h3>
        </div>
        {totalUpcoming7d > 0 && (
          <div className="text-right">
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Due in 7 days</p>
            <p className="text-[13px] font-bold tabular-nums"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
              {formatMUSD(totalUpcoming7d)} <span className="text-[10px] font-normal">MUSD</span>
            </p>
          </div>
        )}
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-3 bottom-3 w-px"
          style={{ background: 'linear-gradient(180deg, var(--border-hi) 0%, transparent 100%)' }} />

        <div className="space-y-1">
          {active.map((payment, i) => {
            const days = daysUntil(payment.nextDate);
            const color = urgencyColor(days);
            const bg = urgencyBg(days);
            const isX402 = payment.isX402;

            return (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: E }}
                className="flex items-center gap-4 group relative"
              >
                {/* Node */}
                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ background: bg, border: `1.5px solid ${color}33` }}>
                  {isX402
                    ? <Zap style={{ width: 13, height: 13, color }} />
                    : <Wallet style={{ width: 13, height: 13, color }} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex items-center justify-between gap-3 py-2.5 px-3.5 rounded-[12px] transition-colors group-hover:bg-gray-50"
                  style={{ border: '1px solid transparent' }}>
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {isX402 ? (payment.endpoint || 'x402 endpoint') : `${payment.recipient?.slice(0, 6)}...${payment.recipient?.slice(-4)}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
                        Every {formatInterval(payment.interval)}
                      </span>
                      {isX402 && (
                        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(124,58,237,0.08)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.15)' }}>
                          x402
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[13px] font-bold tabular-nums"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {formatMUSD(payment.amount)}
                      <span className="text-[10px] font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>MUSD</span>
                    </p>
                    <p className="text-[10.5px] font-medium mt-0.5" style={{ color }}>
                      {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days}d`}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {payments.filter(p => p.isActive).length > 6 && (
        <button className="w-full flex items-center justify-center gap-1.5 mt-3 py-2 text-[12px] font-medium rounded-lg transition-colors hover:bg-gray-50"
          style={{ color: 'var(--text-muted)' }}>
          View all {payments.filter(p => p.isActive).length} schedules
          <ChevronRight style={{ width: 12, height: 12 }} />
        </button>
      )}
    </div>
  );
}
