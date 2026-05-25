"use client";
import { Bitcoin, DollarSign, Shield, Layers } from "lucide-react";
import { useVault } from "@/hooks/useVault";
import { useReadContract } from "wagmi";
import { VAULT_ABI, VAULT_ADDRESS } from "@/lib/contract";
import { motion } from "framer-motion";

function fmt(val: string | number): string {
  const n = typeof val === "string" ? parseFloat(val) : val;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function VaultStats() {
  const { collateral, musdBalance, collateralRatio, payments, isLoading } =
    useVault();

  const { data: mockBtcPrice } = useReadContract({
    address: VAULT_ADDRESS || undefined,
    abi: VAULT_ABI,
    functionName: "mockBtcPriceUSD",
    query: { enabled: !!VAULT_ADDRESS },
  });
  const btcPriceUSD = mockBtcPrice ? Number(mockBtcPrice) : 65_000;

  const ratio =
    collateralRatio === 0n
      ? 0
      : collateralRatio >= BigInt("999999999999999")
      ? Infinity
      : Number(collateralRatio);

  const ratioStatus =
    ratio === 0 ? "empty" : ratio < 150 ? "danger" : ratio < 200 ? "warn" : "ok";

  const ratioLabel =
    ratio === 0 ? "—" : ratio === Infinity ? "∞" : `${ratio}%`;

  const ratioColor =
    ratioStatus === "danger"
      ? "#dc2626"
      : ratioStatus === "warn"
      ? "#d97706"
      : ratioStatus === "ok"
      ? "#16a34a"
      : "var(--text-muted)";

  const activePayments = payments.filter((p) => p.isActive).length;
  const btcFloat = parseFloat(collateral);
  const btcUSD = btcFloat * btcPriceUSD;

  const stats = [
    {
      label: "BTC Collateral",
      value: isLoading ? null : btcFloat.toFixed(4),
      unit: "BTC",
      sub: isLoading ? "" : `≈ $${fmt(btcUSD)} USD`,
      icon: Bitcoin,
      iconColor: "var(--btc)",
      iconBg: "var(--btc-bg)",
      iconBorder: "var(--btc-border)",
      valueColor: "var(--btc)",
      borderAccent: "var(--btc-border)",
    },
    {
      label: "Available MUSD",
      value: isLoading ? null : fmt(musdBalance),
      unit: "MUSD",
      sub: "Ready to deploy",
      icon: DollarSign,
      iconColor: "var(--accent)",
      iconBg: "var(--accent-soft)",
      iconBorder: "var(--accent-border)",
      valueColor: "var(--text-primary)",
      borderAccent: "transparent",
    },
    {
      label: "Collateral Health",
      value: isLoading ? null : ratioLabel,
      unit: "",
      sub: "Min 150% required",
      icon: Shield,
      iconColor: ratioColor,
      iconBg: ratioStatus === "danger" ? "var(--danger-bg)" : ratioStatus === "ok" ? "rgba(22,163,74,0.08)" : "var(--bg-raised)",
      iconBorder: ratioStatus === "danger" ? "var(--danger-border)" : ratioStatus === "ok" ? "rgba(22,163,74,0.2)" : "var(--border)",
      valueColor: ratioColor,
      borderAccent: "transparent",
    },
    {
      label: "Active Schedules",
      value: isLoading ? null : String(activePayments),
      unit: "",
      sub: `${payments.length} total`,
      icon: Layers,
      iconColor: "var(--text-secondary)",
      iconBg: "var(--bg-raised)",
      iconBorder: "var(--border)",
      valueColor: "var(--text-primary)",
      borderAccent: "transparent",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="card"
          style={{ borderColor: stat.borderAccent !== "transparent" ? stat.borderAccent : undefined }}
        >
          <div className="flex items-center justify-between mb-4">
            <span
              className="field-label"
              style={{ letterSpacing: "0.06em" }}
            >
              {stat.label}
            </span>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: stat.iconBg,
                border: `1px solid ${stat.iconBorder}`,
              }}
            >
              <stat.icon size={13} style={{ color: stat.iconColor }} />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2 mt-1">
              <div className="skeleton h-7 w-20" />
              <div className="skeleton h-3 w-14" />
            </div>
          ) : (
            <>
              <p
                className="stat-number"
                style={{ color: stat.valueColor }}
              >
                {stat.value}
                {stat.unit && (
                  <span
                    className="text-sm font-medium ml-1.5"
                    style={{ color: "var(--text-muted)", opacity: 0.7 }}
                  >
                    {stat.unit}
                  </span>
                )}
              </p>
              <p
                className="text-xs mt-2 leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {stat.sub}
              </p>
            </>
          )}
        </motion.div>
      ))}
    </div>
  );
}
