"use client";
import { useState } from "react";
import { Play, Activity, Users, CheckCheck, Clock } from "lucide-react";
import { SchedulerStatus, PaymentStats } from "@/lib/api";
import clsx from "clsx";

interface Props {
  status: SchedulerStatus | null;
  stats: PaymentStats | null;
  onTrigger: () => Promise<void>;
}

export default function SchedulerPanel({ status, stats, onTrigger }: Props) {
  const [triggering, setTriggering] = useState(false);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      await onTrigger();
    } finally {
      setTimeout(() => setTriggering(false), 2000);
    }
  };

  return (
    <div className="vault-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-orange-400" />
          <h3 className="font-semibold text-white">Automation Agent</h3>
        </div>
        <div className={clsx(
          "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full",
          "bg-green-500/10 border border-green-500/20 text-green-400"
        )}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Running
        </div>
      </div>

      {/* Agent Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Registered Users", value: status?.registeredUsers ?? "—", icon: Users },
          { label: "Payments Checked", value: status?.totalChecked ?? "—", icon: Clock },
          { label: "Executed", value: status?.totalExecuted ?? "—", icon: CheckCheck },
          { label: "MUSD Sent", value: stats ? `${stats.totalMUSD.toFixed(0)}` : "—", icon: Activity },
        ].map((item) => (
          <div key={item.label} className="rounded-lg p-3" style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }}>
            <p className="text-lg font-bold text-white">{item.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Last Run */}
      {status?.lastRun && (
        <p className="text-xs text-gray-500 mb-4">
          Last run: {new Date(status.lastRun).toLocaleTimeString()} · Cron: every minute
        </p>
      )}

      {/* Trigger Button */}
      <button
        onClick={handleTrigger}
        disabled={triggering}
        className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
      >
        {triggering ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Scanning payments...
          </>
        ) : (
          <>
            <Play size={14} />
            Trigger Scheduler Now
          </>
        )}
      </button>

      {/* x402 Spending */}
      {stats?.x402Spending && Object.keys(stats.x402Spending).length > 0 && (
        <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>x402 Spending by Endpoint</p>
          {Object.entries(stats.x402Spending).map(([endpoint, amount]) => (
            <div key={endpoint} className="flex items-center justify-between text-xs py-1.5 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-gray-500 truncate max-w-[70%]">{endpoint}</span>
              <span className="text-blue-400 font-medium">{(amount as number).toFixed(2)} MUSD</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
