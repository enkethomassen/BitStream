'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/*
  Bitstream — Bitcoin Cashflow Flow Visualization
  Pure Framer Motion (no Three.js). Modeled after ACE Protocol's tabbed
  auto-advancing flow with blur cross-fades and a requestAnimationFrame
  progress strip on the active tab.

  4-step flow:
    01 — Lock BTC Collateral    (Bitcoin orange)
    02 — Mint MUSD              (MUSD teal)
    03 — Schedule Payments      (Vault purple)
    04 — Agent Executes         (Agent red / pulse)
*/

const E: [number, number, number, number] = [0.22, 1, 0.36, 1];
const spring = { type: 'spring' as const, stiffness: 380, damping: 28 };
const STEP_DURATION = 4400;

const COLORS = {
  btc:    '#F7931A',
  musd:   '#00C9A7',
  vault:  '#8B5CF6',
  agent:  '#FF0040',
  success:'#10D98C',
  text: {
    primary:   'rgba(255,255,255,0.88)',
    secondary: 'rgba(255,255,255,0.45)',
    muted:     'rgba(255,255,255,0.25)',
  },
  bg: {
    card:   'rgba(255,255,255,0.022)',
    border: 'rgba(255,255,255,0.06)',
  },
};

// ─── Step 01 — Lock BTC Collateral ─────────────────────────────────────────
function StepLock({ active }: { active: boolean }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) { setPhase(0); return; }
    const t1 = setTimeout(() => setPhase(1), 350);
    const t2 = setTimeout(() => setPhase(2), 1100);
    const t3 = setTimeout(() => setPhase(3), 1900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [active]);

  return (
    <div className="flex flex-col gap-3">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={{ duration: 0.5, ease: E }}
        className="relative overflow-hidden rounded-2xl p-4"
        style={{
          background: `linear-gradient(135deg, ${COLORS.btc}1a 0%, rgba(0,201,167,0.04) 100%)`,
          border: `1px solid ${COLORS.btc}38`,
        }}
      >
        {phase === 1 && (
          <motion.div
            initial={{ top: 0, opacity: 0.75 }}
            animate={{ top: '100%', opacity: 0 }}
            transition={{ duration: 0.8, ease: 'linear' }}
            className="absolute inset-x-0 h-px pointer-events-none z-10"
            style={{ background: `linear-gradient(90deg, transparent, ${COLORS.btc}cc, transparent)` }}
          />
        )}

        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: `${COLORS.btc}24`, border: `1px solid ${COLORS.btc}44` }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10.5 7c.5-.5.5-1.5-.5-2H6v2.5h4c.5 0 .5-.5.5-.5zM10 9.5H6V12h4c1 0 1.5-1 .5-1.5-.5-.5-1-1-.5-1z" fill={COLORS.btc}/>
              <path d="M8 2v1M8 13v1M6 2.5v1M10 2.5v1M6 12.5v1M10 12.5v1" stroke={COLORS.btc} strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.btc }}>
              Mezo Passport Connected
            </p>
            <p className="text-[11px] font-mono mt-0.5 truncate" style={{ color: COLORS.text.secondary }}>
              bc1q…m4qz · Mezo Mainnet
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <motion.div
              animate={active ? { scale: [1, 1.6, 1], opacity: [1, 0.4, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: COLORS.success, boxShadow: `0 0 5px ${COLORS.success}` }}
            />
            <span className="text-[9px] font-semibold" style={{ color: COLORS.success }}>LIVE</span>
          </div>
        </div>

        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.42, ease: E }}
              className="overflow-hidden"
            >
              <div className="flex items-end gap-4 pt-2 pb-1 border-t" style={{ borderColor: COLORS.bg.border }}>
                <div>
                  <p className="text-[8.5px] uppercase tracking-[0.16em]" style={{ color: COLORS.text.muted }}>
                    BTC Collateral
                  </p>
                  <CountUp value={2.45} decimals={2} duration={0.8} className="text-[22px] font-mono leading-none mt-1"
                    style={{ color: '#edf2ff', letterSpacing: '-0.04em' }} suffix=" BTC" suffixStyle={{ fontSize: 13, color: COLORS.text.secondary }} />
                </div>
                <div className="mb-0.5 ml-auto text-right">
                  <p className="text-[8.5px] uppercase tracking-[0.16em]" style={{ color: COLORS.text.muted }}>USD Value</p>
                  <CountUp value={147420} decimals={0} duration={0.9} className="text-[15px] font-mono leading-none mt-0.5"
                    style={{ color: COLORS.btc, letterSpacing: '-0.03em' }} prefix="$" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {phase >= 3 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: E }}
            className="rounded-xl px-3.5 py-3"
            style={{ background: COLORS.bg.card, border: `1px solid ${COLORS.bg.border}` }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.text.muted }}>
                Vault Health
              </p>
              <span className="text-[10px] font-mono" style={{ color: COLORS.success }}>234% ratio · HEALTHY</span>
            </div>
            <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '78%' }}
                transition={{ duration: 0.9, ease: E, delay: 0.1 }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${COLORS.success}60, ${COLORS.success})`, boxShadow: `0 0 8px ${COLORS.success}66` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 02 — Mint MUSD ───────────────────────────────────────────────────
function StepMint({ active }: { active: boolean }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) { setPhase(0); return; }
    const t1 = setTimeout(() => setPhase(1), 280);
    const t2 = setTimeout(() => setPhase(2), 1000);
    const t3 = setTimeout(() => setPhase(3), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [active]);

  const rows = [
    { label: 'BTC Collateral',     amount: '2.45 BTC',     color: COLORS.btc },
    { label: 'MUSD Minted',         amount: '50,000 MUSD',  color: COLORS.musd },
    { label: 'Available to Spend',  amount: '48,291 MUSD',  color: COLORS.success },
  ];

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: E }}
            className="relative overflow-hidden rounded-2xl p-4"
            style={{ background: `linear-gradient(135deg, ${COLORS.musd}14 0%, rgba(247,147,26,0.04) 100%)`, border: `1px solid ${COLORS.musd}38` }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${COLORS.musd}22`, border: `1px solid ${COLORS.musd}40` }}>
                  <span className="text-[10px] font-mono font-bold" style={{ color: COLORS.musd }}>$</span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.musd }}>
                    Mint MUSD
                  </p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: COLORS.text.secondary }}>amount · 50,000</p>
                </div>
              </div>
              <motion.div
                initial={{ scale: 0.96, opacity: 0.6 }}
                animate={phase >= 2 ? { scale: 1, opacity: 1 } : { scale: 0.96, opacity: 0.6 }}
                className="rounded-lg px-3 py-2 text-[10px] font-semibold"
                style={{
                  background: `${COLORS.musd}1a`,
                  border: `1px solid ${COLORS.musd}40`,
                  color: COLORS.musd,
                }}>
                Mint 50,000 MUSD
              </motion.div>
            </div>

            <AnimatePresence>
              {phase >= 2 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.4, ease: E }}
                  className="overflow-hidden mt-3"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: phase >= 3 ? '100%' : '70%' }}
                        transition={{ duration: phase >= 3 ? 0.36 : 0.8, ease: E }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${COLORS.musd}66, ${COLORS.musd})` }}
                      />
                    </div>
                    {phase >= 3 ? (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="6" fill={`${COLORS.success}22`} stroke={COLORS.success} strokeWidth="1.2" />
                          <path d="M4 7l2 2 4-4.5" stroke={COLORS.success} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.div>
                    ) : (
                      <span className="text-[9px] font-mono" style={{ color: COLORS.musd }}>signing…</span>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase >= 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <div className="space-y-1.5">
              {rows.map((r, i) => (
                <motion.div
                  key={r.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.32, ease: E }}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                  style={{ background: COLORS.bg.card, border: `1px solid ${COLORS.bg.border}` }}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
                  <span className="text-[11px] flex-1 truncate" style={{ color: COLORS.text.secondary }}>{r.label}</span>
                  <span className="text-[11px] font-mono flex-shrink-0" style={{ color: r.color }}>{r.amount}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-3 rounded-xl px-3.5 py-3"
              style={{ background: `${COLORS.musd}0e`, border: `1px solid ${COLORS.musd}22` }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.musd }}>
                  Overcollateralized
                </p>
                <span className="text-[10px] font-mono" style={{ color: COLORS.musd }}>234%</span>
              </div>
              <div className="h-[4px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '85%' }}
                  transition={{ duration: 0.85, ease: E, delay: 0.2 }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${COLORS.musd}60, ${COLORS.musd})` }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 03 — Schedule Payments ──────────────────────────────────────────
function StepSchedule({ active }: { active: boolean }) {
  const [queueVisible, setQueueVisible] = useState(false);
  const [reserveVisible, setReserveVisible] = useState(false);

  useEffect(() => {
    if (!active) { setQueueVisible(false); setReserveVisible(false); return; }
    const t1 = setTimeout(() => setQueueVisible(true), 280);
    const t2 = setTimeout(() => setReserveVisible(true), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [active]);

  const payments = [
    { id: 'p1', label: 'Rent',                  amount: '$1,500 MUSD',  cadence: 'Monthly · Due in 3 days',  status: 'READY',   color: COLORS.success },
    { id: 'p2', label: 'AWS Infrastructure',    amount: '$142 MUSD',    cadence: 'Monthly · Due in 11 days', status: 'QUEUED',  color: COLORS.btc },
    { id: 'p3', label: 'Spotify via x402',      amount: '$9.99 MUSD',   cadence: 'Monthly · Due in 5 days',  status: 'x402',    color: COLORS.vault },
    { id: 'p4', label: 'Creator Payout',         amount: '$500 MUSD',    cadence: 'Weekly · Due in 1 day',    status: 'QUEUED',  color: COLORS.musd },
  ];

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence>
        {reserveVisible && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: E }}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
            style={{ background: `${COLORS.success}0f`, border: `1px solid ${COLORS.success}2a` }}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${COLORS.success}22` }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L7.5 4H11L8.5 6.5L9.5 10L6 8L2.5 10L3.5 6.5L1 4H4.5L6 1Z" fill={COLORS.success} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] font-semibold" style={{ color: COLORS.success }}>
                48,291 MUSD available · Coverage 112%
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '82%' }}
                    transition={{ duration: 0.9, ease: E, delay: 0.18 }}
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg, ${COLORS.success}55, ${COLORS.success})` }}
                  />
                </div>
                <span className="text-[9px] font-mono flex-shrink-0" style={{ color: COLORS.success }}>healthy</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {queueVisible && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.text.muted }}>
                Payment Schedule
              </p>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded"
                style={{ background: `${COLORS.vault}1a`, color: COLORS.vault, border: `1px solid ${COLORS.vault}33` }}>
                {payments.length} scheduled
              </span>
            </div>
            <div className="space-y-1.5">
              {payments.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.09, duration: 0.34, ease: E }}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                  style={{ background: COLORS.bg.card, border: `1px solid ${COLORS.bg.border}` }}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] truncate" style={{ color: COLORS.text.primary }}>{p.label}</p>
                    <p className="text-[9px] mt-0.5" style={{ color: COLORS.text.muted }}>{p.cadence}</p>
                  </div>
                  <span className="text-[11px] font-mono flex-shrink-0" style={{ color: p.color }}>{p.amount}</span>
                  <span className="text-[8px] font-semibold uppercase px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: `${p.color}1c`, color: p.color, border: `1px solid ${p.color}33` }}>
                    {p.status}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Step 04 — Agent Executes ──────────────────────────────────────────────
function StepAgent({ active }: { active: boolean }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) { setPhase(0); return; }
    const t1 = setTimeout(() => setPhase(1), 260);
    const t2 = setTimeout(() => setPhase(2), 1300);
    const t3 = setTimeout(() => setPhase(3), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [active]);

  const checks = [
    { label: 'Collateral ratio',        value: '234%' },
    { label: 'Spending cap',            value: '$2,500/mo' },
    { label: 'Recipient whitelisted',    value: '4 addresses' },
    { label: 'MUSD balance sufficient',  value: '48,291' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence>
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] px-1 mb-2" style={{ color: COLORS.text.muted }}>
              Policy Check
            </p>
            <div className="space-y-1.5">
              {checks.map((c, i) => (
                <motion.div
                  key={c.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.3, ease: E }}
                  className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
                  style={{ background: COLORS.bg.card, border: `1px solid ${COLORS.bg.border}` }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...spring, delay: i * 0.08 + 0.18 }}
                    className="w-[15px] h-[15px] rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: `${COLORS.success}24`, border: `1px solid ${COLORS.success}40` }}
                  >
                    <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                      <path d="M1 3.5L2.5 5L6 2" stroke={COLORS.success} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </motion.div>
                  <span className="text-[11px] flex-1" style={{ color: COLORS.text.secondary }}>{c.label}</span>
                  <span className="text-[9.5px] font-mono" style={{ color: COLORS.text.muted }}>{c.value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, ease: E }}
            className="relative overflow-hidden rounded-2xl p-4"
            style={{
              background: `linear-gradient(135deg, ${COLORS.agent}10 0%, ${COLORS.success}08 100%)`,
              border: `1px solid ${COLORS.agent}30`,
            }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <motion.div
                animate={phase === 2 ? { rotate: 360 } : {}}
                transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="5" stroke={COLORS.agent} strokeWidth="1.4" strokeDasharray="4 2" />
                </svg>
              </motion.div>
              <p className="text-[11.5px] font-semibold" style={{ color: COLORS.agent }}>
                {phase < 3 ? 'Agent executing…' : 'Execution complete'}
              </p>
              {phase >= 3 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={spring} className="ml-auto">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <circle cx="7.5" cy="7.5" r="6.5" fill={`${COLORS.success}24`} stroke={COLORS.success} strokeWidth="1.2" />
                    <path d="M4.5 7.5L6.5 9.5L11 5" stroke={COLORS.success} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px]">
                <span style={{ color: COLORS.text.secondary }}>Rent</span>
                <span className="font-mono" style={{ color: COLORS.agent }}>$1,500 MUSD</span>
              </div>
              <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: phase >= 3 ? '100%' : '65%' }}
                  transition={{ duration: phase >= 3 ? 0.42 : 0.85, ease: E }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${COLORS.agent}80, ${COLORS.agent}, ${COLORS.success})` }}
                />
              </div>
            </div>

            <AnimatePresence>
              {phase >= 3 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.32, ease: E }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 pt-2.5 border-t flex items-center gap-2" style={{ borderColor: COLORS.bg.border }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <rect x="1" y="1" width="8" height="8" rx="1.5" stroke={COLORS.text.muted} strokeWidth="1" />
                      <path d="M3 5l1.5 1.5L7 3.5" stroke={COLORS.success} strokeWidth="1" strokeLinecap="round" />
                    </svg>
                    <p className="text-[9px]" style={{ color: COLORS.text.muted }}>
                      Execution logged · txHash:{' '}
                      <span className="font-mono">4qHz…e7Vb</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── CountUp helper ────────────────────────────────────────────────────────
function CountUp({
  value, decimals = 0, duration = 0.8, className, style, prefix, suffix, suffixStyle,
}: {
  value: number; decimals?: number; duration?: number;
  className?: string; style?: React.CSSProperties;
  prefix?: string; suffix?: string; suffixStyle?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let id: number;
    const tick = (now: number) => {
      const t = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(eased * value);
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value, duration]);
  const formatted = decimals === 0
    ? Math.round(display).toLocaleString()
    : display.toFixed(decimals);
  return (
    <p className={className} style={style}>
      {prefix}{formatted}{suffix && <span style={suffixStyle}>{suffix}</span>}
    </p>
  );
}

// ─── Step definitions ──────────────────────────────────────────────────────
interface Step {
  n: string;
  label: string;
  sublabel: string;
  color: string;
}

const STEPS: Step[] = [
  { n: '01', label: 'Lock BTC Collateral', sublabel: 'Vault on Mezo',           color: COLORS.btc },
  { n: '02', label: 'Mint MUSD',           sublabel: 'Borrow against BTC',      color: COLORS.musd },
  { n: '03', label: 'Schedule Payments',    sublabel: 'Wallets · x402 endpoints', color: COLORS.vault },
  { n: '04', label: 'Agent Executes',       sublabel: 'Policy-bound automation',  color: COLORS.agent },
];

// ─── Floating data pills (top-left, top-right, bottom-left, bottom-right) ──
const PILLS = [
  { pos: 'top-[3%] -left-[10%]',    label: 'BTC Locked',    sub: '2.45 BTC',     color: COLORS.btc,    pulse: false },
  { pos: 'top-[3%] -right-[10%]',   label: 'Vault Health',  sub: '234% ratio',   color: COLORS.musd,   pulse: true },
  { pos: 'bottom-[8%] -left-[10%]', label: 'x402 Ready',    sub: '3 endpoints',  color: COLORS.vault,  pulse: false },
  { pos: 'bottom-[8%] -right-[10%]', label: 'Agent Active', sub: 'next: 42s',    color: COLORS.agent,  pulse: true },
];

// ─── Main scene ─────────────────────────────────────────────────────────────
export function BitstreamFlowScene() {
  const [activeStep, setActiveStep] = useState(0);
  const timeRef = useRef<number>(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(s => (s + 1) % STEPS.length);
    }, STEP_DURATION);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setProgress(0);
    timeRef.current = performance.now();
    let id: number;
    const raf = (now: number) => {
      const elapsed = now - timeRef.current;
      setProgress(Math.min(elapsed / STEP_DURATION, 1));
      if (elapsed < STEP_DURATION) id = requestAnimationFrame(raf);
    };
    id = requestAnimationFrame(raf);
    return () => cancelAnimationFrame(id);
  }, [activeStep]);

  const step = STEPS[activeStep];

  return (
    <div className="relative h-full w-full" style={{ minHeight: 560 }}>
      {/* Ambient glow behind panel */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: '120%', height: '70%',
            background: `radial-gradient(ellipse, ${step.color}1a 0%, transparent 60%)`,
            filter: 'blur(60px)',
            transition: 'background 600ms ease',
          }} />
      </div>

      {/* Panel */}
      <div className="relative rounded-[24px] flex flex-col select-none overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(17,17,17,0.92) 0%, rgba(10,10,10,0.92) 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 24px 72px rgba(0,0,0,0.55), 0 0 96px rgba(247,147,26,0.06)',
          backdropFilter: 'blur(20px)',
          minHeight: 560,
        }}>

        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0"
          style={{ borderBottom: `1px solid ${COLORS.bg.border}`, background: 'rgba(255,255,255,0.012)' }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FF5F57' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#FFBD2E' }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#28C840' }} />
          <span className="ml-4 text-[10px] font-mono" style={{ color: COLORS.text.muted }}>bitstream.app/flow</span>
          <div className="ml-auto flex items-center gap-1.5">
            <motion.span
              animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: COLORS.success, boxShadow: `0 0 6px ${COLORS.success}` }} />
            <span className="text-[9px] font-mono" style={{ color: COLORS.success }}>live</span>
          </div>
        </div>

        {/* Step tabs */}
        <div className="flex gap-1.5 px-3 pt-3 pb-1 flex-shrink-0 overflow-x-auto">
          {STEPS.map((s, i) => {
            const isActive = i === activeStep;
            const isDone = i < activeStep;
            return (
              <button
                key={s.n}
                onClick={() => setActiveStep(i)}
                className="relative flex-1 min-w-0 rounded-xl px-2 py-2 sm:px-3 sm:py-2.5 text-left overflow-hidden"
                style={{
                  background: isActive ? `${s.color}10` : 'rgba(255,255,255,0.018)',
                  border: `1px solid ${isActive ? `${s.color}33` : 'rgba(255,255,255,0.06)'}`,
                  transition: 'background 240ms, border-color 240ms',
                }}
              >
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 h-[2px] rounded-full"
                    style={{
                      width: `${progress * 100}%`,
                      background: `linear-gradient(90deg, ${s.color}80, ${s.color})`,
                      transition: 'none',
                    }}
                  />
                )}
                <div className="flex items-center gap-1.5">
                  {isDone ? (
                    <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ background: `${COLORS.success}28` }}>
                      <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
                        <path d="M1 3.5L2.5 5L6 2" stroke={COLORS.success} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  ) : (
                    <span className="text-[9px] font-mono flex-shrink-0"
                      style={{ color: isActive ? s.color : COLORS.text.muted, fontWeight: 700 }}>
                      {s.n}
                    </span>
                  )}
                  <div className="min-w-0 hidden sm:block">
                    <p className="text-[10px] font-semibold leading-none truncate"
                      style={{ color: isActive ? COLORS.text.primary : COLORS.text.secondary }}>
                      {s.label}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Step header */}
        <div className="px-4 pt-4 pb-3 flex-shrink-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.26, ease: E }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${step.color}16`, border: `1px solid ${step.color}30` }}>
                <span className="text-[11px] font-mono" style={{ color: step.color, fontWeight: 700 }}>{step.n}</span>
              </div>
              <div>
                <p className="text-[15px] font-semibold leading-none" style={{ color: COLORS.text.primary, letterSpacing: '-0.028em' }}>
                  {step.label}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: step.color, opacity: 0.72 }}>{step.sublabel}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-hidden px-4 pb-4 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 12, filter: 'blur(3px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(3px)' }}
              transition={{ duration: 0.36, ease: E }}
              className="h-full"
            >
              {activeStep === 0 && <StepLock active />}
              {activeStep === 1 && <StepMint active />}
              {activeStep === 2 && <StepSchedule active />}
              {activeStep === 3 && <StepAgent active />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 pb-4 flex-shrink-0">
          {STEPS.map((s, i) => (
            <button
              key={s.n}
              onClick={() => setActiveStep(i)}
              className="transition-all duration-300"
              style={{
                width: i === activeStep ? 22 : 6,
                height: 6,
                borderRadius: 3,
                background: i === activeStep ? s.color : 'rgba(255,255,255,0.12)',
              }}
              aria-label={`Step ${s.n}: ${s.label}`}
            />
          ))}
        </div>
      </div>

      {/* Floating data pills */}
      {PILLS.map((p, i) => (
        <motion.div
          key={p.label}
          initial={{ opacity: 0, scale: 0.86, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.55, ease: E, delay: 0.5 + i * 0.12 }}
          className={`pointer-events-none absolute ${p.pos} hidden xl:block`}
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3.6 + (i * 0.3), repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="rounded-2xl px-4 py-3"
              style={{
                background: 'rgba(17,17,17,0.95)',
                border: `1px solid ${p.color}40`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 24px ${p.color}1a`,
                minWidth: 140,
                backdropFilter: 'blur(12px)',
              }}>
              <div className="flex items-center gap-2" style={{ color: p.color }}>
                {p.pulse ? (
                  <motion.span
                    animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    className="h-2 w-2 rounded-full"
                    style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
                ) : (
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }} />
                )}
                <span className="text-[12px] font-bold">{p.label}</span>
              </div>
              <div className="mt-1 font-mono text-[10px]" style={{ color: COLORS.text.muted }}>{p.sub}</div>
            </div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
