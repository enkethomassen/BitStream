'use client';
import { motion } from 'framer-motion';
import { useNetwork, type MezoNetwork } from '@/context/network-context';

interface Props {
  compact?: boolean;
}

export default function NetworkToggle({ compact = false }: Props) {
  const { network, setNetwork, isSwitching } = useNetwork();

  const networks: { id: MezoNetwork; label: string; shortLabel: string }[] = [
    { id: 'testnet', label: 'Testnet', shortLabel: 'Test' },
    { id: 'mainnet', label: 'Mainnet', shortLabel: 'Main' },
  ];

  if (compact) {
    return (
      <div
        className="flex items-center gap-1 p-1 rounded-xl"
        style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-base)' }}
      >
        {networks.map((n) => {
          const active = network === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setNetwork(n.id)}
              disabled={isSwitching}
              className="relative px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all"
              style={{
                color: active
                  ? n.id === 'testnet' ? '#7c3aed' : 'var(--btc)'
                  : 'var(--text-muted)',
              }}
            >
              {active && (
                <motion.div
                  layoutId="network-pill-compact"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: n.id === 'testnet' ? 'rgba(124,58,237,0.1)' : 'var(--btc-dim)',
                    border: `1px solid ${n.id === 'testnet' ? 'rgba(124,58,237,0.22)' : 'var(--btc-border)'}`,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 36 }}
                />
              )}
              <span className="relative z-10">{n.shortLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center gap-0.5 p-1 rounded-xl"
      style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-base)' }}
    >
      {networks.map((n) => {
        const active = network === n.id;
        return (
          <button
            key={n.id}
            onClick={() => setNetwork(n.id)}
            disabled={isSwitching}
            className="relative px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
            style={{
              color: active
                ? n.id === 'testnet' ? '#7c3aed' : 'var(--btc)'
                : 'var(--text-tertiary)',
              opacity: isSwitching ? 0.6 : 1,
            }}
          >
            {active && (
              <motion.div
                layoutId="network-pill"
                className="absolute inset-0 rounded-lg"
                style={{
                  background: n.id === 'testnet' ? 'rgba(124,58,237,0.1)' : 'var(--btc-dim)',
                  border: `1px solid ${n.id === 'testnet' ? 'rgba(124,58,237,0.22)' : 'var(--btc-border)'}`,
                  boxShadow: n.id === 'testnet'
                    ? '0 0 12px rgba(124,58,237,0.15)'
                    : '0 0 12px rgba(247,147,26,0.18)',
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 36 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {active && (
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: n.id === 'testnet' ? '#7c3aed' : 'var(--btc)' }}
                />
              )}
              {n.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
