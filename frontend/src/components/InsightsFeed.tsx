'use client';
import { useState } from 'react';
import { AlertTriangle, TrendingUp, X, ChevronRight, BrainCircuit, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const E: [number, number, number, number] = [0.16, 1, 0.3, 1];

interface Insight {
  id: string;
  type: 'recommendation' | 'alert' | 'prediction';
  impact: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  confidence: number;
  action?: { label: string };
}

const typeConfig: Record<string, { icon: React.FC<any>; color: string }> = {
  recommendation: { icon: BrainCircuit, color: 'var(--accent)' },
  alert:          { icon: AlertTriangle, color: '#d97706' },
  prediction:     { icon: TrendingUp,   color: 'var(--green)' },
};

const impactColor: Record<string, string> = {
  high:   'var(--accent)',
  medium: '#d97706',
  low:    'var(--text-muted)',
};

const SEED_INSIGHTS: Insight[] = [
  {
    id: '1',
    type: 'recommendation',
    impact: 'high',
    title: 'Route idle MUSD to yield strategy',
    description: 'You have 28,000 MUSD sitting inactive for 4+ days. Routing to the Mezo yield vault could generate ~6.2% APY with same-day liquidity.',
    confidence: 0.91,
    action: { label: 'View yield' },
  },
  {
    id: '2',
    type: 'prediction',
    impact: 'medium',
    title: 'Payroll batch due in 3 days',
    description: 'Based on your scheduled cadence, a 12,000 MUSD payroll execution is due on the 16th. Reserve buffer looks healthy at 187% collateral.',
    confidence: 0.97,
  },
  {
    id: '3',
    type: 'alert',
    impact: 'medium',
    title: 'x402 spending up 34% this week',
    description: 'API endpoint payments have accelerated. Review active x402 schedules to confirm this is expected usage.',
    confidence: 0.84,
    action: { label: 'x402 monitor' },
  },
];

export default function InsightsFeed() {
  const [insights, setInsights] = useState<Insight[]>(SEED_INSIGHTS);

  const dismiss = (id: string) => setInsights(prev => prev.filter(i => i.id !== id));

  if (!insights.length) {
    return (
      <div className="card-base p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <BrainCircuit className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          <h3 className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            AI Insights
          </h3>
        </div>
        <div className="py-6 text-center space-y-2.5">
          <div className="w-9 h-9 mx-auto flex items-center justify-center rounded-xl"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
            <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
            No active recommendations
          </p>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Treasury signals nominal. Agent is monitoring.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-base p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <BrainCircuit className="h-4 w-4" style={{ color: 'var(--accent)' }} />
          <h3 className="text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            AI Insights
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
          {insights.length} active
        </span>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {insights.map((insight, i) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 16, scale: 0.97 }}
              transition={{ delay: i * 0.04, duration: 0.32, ease: E }}
            >
              <InsightItem insight={insight} onDismiss={dismiss} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function InsightItem({ insight, onDismiss }: { insight: Insight; onDismiss: (id: string) => void }) {
  const cfg = typeConfig[insight.type] ?? typeConfig.recommendation;
  const Icon = cfg.icon;
  const conf = Math.round(insight.confidence * 100);

  return (
    <div
      className="group flex gap-3.5 p-4 rounded-[14px] transition-all relative overflow-hidden"
      style={{ border: '1px solid var(--border-base)', background: 'var(--bg-raised)' }}
    >
      {/* Ambient accent glow */}
      <div className="pointer-events-none absolute inset-0 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(ellipse at 0% 50%, ${cfg.color}08 0%, transparent 55%)` }} />

      <div className="mt-0.5 shrink-0 w-8 h-8 flex items-center justify-center rounded-[10px] relative"
        style={{ background: `${cfg.color}12`, border: `1px solid ${cfg.color}22` }}>
        <Icon className="w-4 h-4" style={{ color: cfg.color, width: 15, height: 15 }} />
      </div>

      <div className="flex-1 min-w-0 relative">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
            {insight.title}
          </p>
          <button
            onClick={() => onDismiss(insight.id)}
            className="shrink-0 p-1 rounded-md transition-colors hover:bg-gray-100"
            style={{ color: 'var(--text-muted)' }}
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>
        <p className="text-[12px] mt-1.5 leading-[1.7]" style={{ color: 'var(--text-secondary)' }}>
          {insight.description}
        </p>

        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {/* Impact badge */}
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-full"
            style={{
              background: `${impactColor[insight.impact]}12`,
              color: impactColor[insight.impact],
              border: `1px solid ${impactColor[insight.impact]}22`,
            }}>
            {insight.impact}
          </span>

          {/* Confidence bar */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-base)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${conf}%` }}
                transition={{ duration: 0.9, ease: E }}
                className="h-full rounded-full"
                style={{ background: cfg.color }}
              />
            </div>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{conf}%</span>
          </div>

          {insight.action && (
            <button className="ml-auto flex items-center gap-1 text-[11.5px] font-semibold transition-opacity hover:opacity-100"
              style={{ color: cfg.color, opacity: 0.8 }}>
              {insight.action.label}
              <ChevronRight style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
