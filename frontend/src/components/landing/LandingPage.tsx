'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { ArrowRight, Lock, Coins, Zap, Shield, BrainCircuit, Globe, TrendingUp } from 'lucide-react';

const BitcoinHero3D = dynamic(() => import('./BitcoinHero3D'), { ssr: false });

// ─── Motion config ─────────────────────────────────────────────────────────
const E: [number, number, number, number] = [0.22, 1, 0.36, 1];
const EC: [number, number, number, number] = [0.16, 1, 0.3, 1];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 32, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  transition: { duration: 0.9, ease: EC, delay },
});

// ─── Section reveal ──────────────────────────────────────────────────────────
function RevealSection({ children, delay = 0, className = '' }: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.85, ease: EC, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Stats ───────────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Total Value Locked', value: '$2.4M', sub: 'in BTC collateral' },
  { label: 'Active Vaults', value: '847', sub: 'across Mezo testnet' },
  { label: 'Payments Processed', value: '14,209', sub: 'MUSD disbursed' },
  { label: 'Uptime', value: '99.97%', sub: 'scheduler reliability' },
];

// ─── How It Works ────────────────────────────────────────────────────────────
const STEPS = [
  {
    icon: Lock,
    number: '01',
    title: 'Lock BTC',
    desc: 'Deposit Bitcoin as collateral into the BitStream Vault on Mezo. Your BTC stays self-custodial — never leaves the protocol.',
    color: '#F7931A',
  },
  {
    icon: Coins,
    number: '02',
    title: 'Mint MUSD',
    desc: 'Borrow up to 66% of your BTC value as MUSD stablecoins — at a 150% collateral ratio. No credit checks. No banks.',
    color: '#00c9a7',
  },
  {
    icon: Zap,
    number: '03',
    title: 'Automate Payments',
    desc: 'Schedule recurring MUSD payouts to any wallet or x402-enabled service. The agentic treasury engine executes them automatically.',
    color: '#ffaa3c',
  },
];

// ─── Features ────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Shield,
    title: 'Self-Custodial Vault',
    desc: 'Your BTC collateral is locked in an audited smart contract — no custodians, no counterparty risk.',
    accent: '#F7931A',
  },
  {
    icon: BrainCircuit,
    title: 'AI Cashflow Agent',
    desc: 'An autonomous treasury manager monitors collateral health, routes payments, and optimizes your MUSD flows 24/7.',
    accent: '#00c9a7',
  },
  {
    icon: Globe,
    title: 'x402 Payment Layer',
    desc: 'Pay any HTTP endpoint with MUSD via the x402 protocol — machine-native micropayments for the agent economy.',
    accent: '#8b5cf6',
  },
  {
    icon: TrendingUp,
    title: 'Collateral Guard',
    desc: 'Real-time ratio monitoring with three-tier alerts — WARNING, CRITICAL, and EMERGENCY auto-pause — to protect your position.',
    accent: '#ffaa3c',
  },
];

// ─── Architecture Layers ──────────────────────────────────────────────────────
const LAYERS = [
  {
    label: 'CAPITAL LAYER',
    name: 'BitStream Vault',
    tech: 'Mezo • Solidity • BTC',
    desc: 'BTC collateral + MUSD issuance',
    color: '#F7931A',
    y: 0,
  },
  {
    label: 'AUTOMATION LAYER',
    name: 'Agentic Scheduler',
    tech: 'Node.js • BullMQ • TypeScript',
    desc: 'Payment execution + vault monitoring',
    color: '#00c9a7',
    y: 1,
  },
  {
    label: 'PAYMENT LAYER',
    name: 'x402 Protocol',
    tech: 'HTTP 402 • MUSD • Mezo',
    desc: 'Machine-native payments to any service',
    color: '#8b5cf6',
    y: 2,
  },
];

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ onConnect }: { onConnect: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EC }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 md:px-12"
      style={{
        background: scrolled ? 'rgba(6,6,8,0.92)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(247,147,26,0.10)' : 'none',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'background 0.4s, border-color 0.4s',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-black font-black text-sm"
          style={{ background: '#F7931A' }}
        >
          ₿
        </div>
        <span
          className="font-black text-xl tracking-tight"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
        >
          Bitstream
        </span>
      </div>

      <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {['Protocol', 'Docs', 'GitHub'].map((item) => (
          <a
            key={item}
            href="#"
            className="hover:text-[#F7931A] transition-colors duration-200"
          >
            {item}
          </a>
        ))}
      </div>

      <button
        onClick={onConnect}
        className="btc-btn-sm px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
        style={{
          background: 'linear-gradient(135deg, #F7931A 0%, #ffaa3c 100%)',
          color: '#050505',
          fontFamily: 'var(--font-display)',
        }}
      >
        Connect Wallet
      </button>
    </motion.nav>
  );
}

// ─── Main LandingPage ─────────────────────────────────────────────────────────
export default function LandingPage({ onConnectWallet }: { onConnectWallet: () => void }) {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroY = useTransform(scrollY, [0, 500], [0, 80]);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: 'var(--bg-void)', fontFamily: 'var(--font-body)' }}
    >
      <Navbar onConnect={onConnectWallet} />

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
      >
        {/* 3D Canvas */}
        <BitcoinHero3D />

        {/* Radial gradient overlay */}
        <div
          className="absolute inset-0 z-[1] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 50%, transparent 0%, rgba(6,6,8,0.55) 60%, rgba(6,6,8,0.95) 100%)',
          }}
        />

        {/* Hero content */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-[2] flex flex-col items-center text-center px-6 max-w-5xl mx-auto"
        >
          <motion.div {...fadeUp(0.1)}>
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 tracking-widest uppercase"
              style={{
                background: 'rgba(247,147,26,0.08)',
                border: '1px solid rgba(247,147,26,0.22)',
                color: '#F7931A',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#F7931A] animate-pulse" />
              Live on Mezo Testnet
            </span>
          </motion.div>

          <motion.h1
            {...fadeUp(0.22)}
            className="font-black leading-[0.92] tracking-tight mb-8"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(3.2rem, 9vw, 8.5rem)',
              color: 'var(--text-primary)',
            }}
          >
            Your Bitcoin.
            <br />
            <span
              className="inline-block"
              style={{
                background: 'linear-gradient(135deg, #F7931A 0%, #ffaa3c 40%, #fff8e7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Working.
            </span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.38)}
            className="text-lg md:text-xl leading-relaxed max-w-2xl mb-10"
            style={{ color: 'var(--text-secondary)' }}
          >
            Lock BTC as collateral. Mint MUSD. Deploy an autonomous treasury agent
            that pays salaries, subscriptions, and x402 services — all without touching your Bitcoin.
          </motion.p>

          <motion.div {...fadeUp(0.52)} className="flex flex-col sm:flex-row gap-4 items-center">
            <button
              onClick={onConnectWallet}
              className="group flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-base transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #F7931A 0%, #ffaa3c 100%)',
                color: '#050505',
                fontFamily: 'var(--font-display)',
                boxShadow: '0 0 40px rgba(247,147,26,0.3), 0 4px 24px rgba(0,0,0,0.5)',
              }}
            >
              Connect Mezo Passport
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-200" />
            </button>

            <a
              href="#how-it-works"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base transition-all duration-200 hover:bg-white/5"
              style={{
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-base)',
                fontFamily: 'var(--font-display)',
              }}
            >
              See how it works
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          {...fadeUp(1.2)}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[2] flex flex-col items-center gap-2"
        >
          <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            scroll
          </span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-px h-10"
            style={{ background: 'linear-gradient(to bottom, rgba(247,147,26,0.6), transparent)' }}
          />
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section className="relative py-16 border-y" style={{ borderColor: 'var(--border-lo)' }}>
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, rgba(247,147,26,0.03) 0%, transparent 50%, rgba(247,147,26,0.03) 100%)' }}
        />
        <div className="relative max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <RevealSection key={s.label} delay={i * 0.1} className="text-center">
              <div
                className="text-4xl md:text-5xl font-black mb-1"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: 'linear-gradient(135deg, #F7931A 0%, #ffaa3c 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {s.value}
              </div>
              <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                {s.label}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {s.sub}
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-28 px-6 max-w-6xl mx-auto">
        <RevealSection className="text-center mb-20">
          <p
            className="text-xs tracking-widest uppercase mb-4"
            style={{ color: '#F7931A', fontFamily: 'var(--font-mono)' }}
          >
            Protocol
          </p>
          <h2
            className="font-black text-4xl md:text-6xl tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            Three steps to
            <br />
            <span style={{ color: '#F7931A' }}>automated income</span>
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            From idle BTC to a fully automated payment engine in minutes.
          </p>
        </RevealSection>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div
            className="hidden md:block absolute top-16 left-[calc(16.67%-1px)] right-[calc(16.67%-1px)] h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(247,147,26,0.3), transparent)' }}
          />

          {STEPS.map((step, i) => (
            <RevealSection key={step.number} delay={i * 0.15}>
              <div
                className="relative p-8 rounded-3xl h-full"
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${step.color}22`,
                  boxShadow: `0 0 40px ${step.color}08`,
                }}
              >
                {/* Step number */}
                <div
                  className="text-xs font-bold tracking-widest mb-6"
                  style={{ color: step.color, fontFamily: 'var(--font-mono)' }}
                >
                  {step.number}
                </div>

                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                  style={{ background: `${step.color}15`, border: `1px solid ${step.color}30` }}
                >
                  <step.icon size={26} style={{ color: step.color }} />
                </div>

                <h3
                  className="font-bold text-xl mb-3"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                >
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {step.desc}
                </p>

                {/* Hover glow */}
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${step.color}60, transparent)` }}
                />
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-28 px-6" style={{ background: 'var(--bg-surface)' }}>
        <div className="max-w-6xl mx-auto">
          <RevealSection className="text-center mb-20">
            <p
              className="text-xs tracking-widest uppercase mb-4"
              style={{ color: '#F7931A', fontFamily: 'var(--font-mono)' }}
            >
              Features
            </p>
            <h2
              className="font-black text-4xl md:text-6xl tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Premium Bitcoin finance
              <br />
              <span style={{ color: 'var(--text-tertiary)' }}>infrastructure</span>
            </h2>
          </RevealSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <RevealSection key={f.title} delay={i * 0.1}>
                <div
                  className="p-7 rounded-3xl h-full group cursor-default transition-all duration-300 hover:-translate-y-1"
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-base)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                    style={{ background: `${f.accent}12`, border: `1px solid ${f.accent}28` }}
                  >
                    <f.icon size={22} style={{ color: f.accent }} />
                  </div>
                  <h3
                    className="font-bold text-base mb-2"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                  >
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {f.desc}
                  </p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARCHITECTURE ── */}
      <section className="py-28 px-6 max-w-5xl mx-auto">
        <RevealSection className="text-center mb-20">
          <p
            className="text-xs tracking-widest uppercase mb-4"
            style={{ color: '#F7931A', fontFamily: 'var(--font-mono)' }}
          >
            Architecture
          </p>
          <h2
            className="font-black text-4xl md:text-6xl tracking-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            Three-layer
            <br />
            stack
          </h2>
        </RevealSection>

        <div className="relative flex flex-col gap-4">
          {/* Vertical line */}
          <div
            className="absolute left-8 top-8 bottom-8 w-px hidden md:block"
            style={{ background: 'linear-gradient(to bottom, #F7931A, #00c9a7, #8b5cf6)' }}
          />

          {LAYERS.map((layer, i) => (
            <RevealSection key={layer.name} delay={i * 0.15}>
              <div
                className="flex items-center gap-6 p-6 rounded-3xl transition-all duration-300 hover:-translate-x-1 md:ml-16"
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${layer.color}22`,
                }}
              >
                {/* Dot on line */}
                <div
                  className="hidden md:flex absolute -left-3 w-6 h-6 rounded-full items-center justify-center -ml-16"
                  style={{ background: layer.color, boxShadow: `0 0 16px ${layer.color}60` }}
                />

                <div
                  className="w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl font-black"
                  style={{
                    background: `${layer.color}12`,
                    border: `1px solid ${layer.color}28`,
                    color: layer.color,
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {i + 1}
                </div>

                <div className="flex-1">
                  <div
                    className="text-xs tracking-widest uppercase mb-1"
                    style={{ color: layer.color, fontFamily: 'var(--font-mono)' }}
                  >
                    {layer.label}
                  </div>
                  <div
                    className="font-bold text-lg mb-0.5"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
                  >
                    {layer.name}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {layer.desc}
                  </div>
                </div>

                <div
                  className="hidden lg:block px-3 py-1 rounded-full text-xs font-medium"
                  style={{
                    background: `${layer.color}10`,
                    border: `1px solid ${layer.color}20`,
                    color: layer.color,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {layer.tech}
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        className="py-32 px-6 relative overflow-hidden"
        style={{ background: 'var(--bg-surface)' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(247,147,26,0.06) 0%, transparent 70%)',
          }}
        />
        <div className="relative max-w-3xl mx-auto text-center">
          <RevealSection>
            <h2
              className="font-black leading-[0.95] tracking-tight mb-6"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2.5rem, 7vw, 6rem)',
                color: 'var(--text-primary)',
              }}
            >
              Start your
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #F7931A 0%, #ffaa3c 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Bitcoin paycheck
              </span>
              <br />
              today.
            </h2>

            <p className="text-lg mb-10" style={{ color: 'var(--text-secondary)' }}>
              Your BTC has been sleeping. It's time to put it to work.
            </p>

            <button
              onClick={onConnectWallet}
              className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-bold text-lg transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #F7931A 0%, #ffaa3c 100%)',
                color: '#050505',
                fontFamily: 'var(--font-display)',
                boxShadow: '0 0 60px rgba(247,147,26,0.25), 0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              Connect Mezo Passport
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-200" />
            </button>
          </RevealSection>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="py-12 px-6 border-t"
        style={{ borderColor: 'var(--border-lo)', background: 'var(--bg-void)' }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-black font-black text-xs"
              style={{ background: '#F7931A' }}
            >
              ₿
            </div>
            <span
              className="font-bold text-base"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-secondary)' }}
            >
              Bitstream
            </span>
          </div>

          <p className="text-xs text-center" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Bitcoin-backed automated cashflow engine on Mezo. Self-custodial. Permissionless.
          </p>

          <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
            {['Protocol', 'Docs', 'GitHub', 'Audit'].map((l) => (
              <a key={l} href="#" className="hover:text-[#F7931A] transition-colors duration-200">
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
