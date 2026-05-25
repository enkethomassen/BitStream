"use client";
import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Wallet, Globe, Clock, CheckCircle, XCircle, X, Loader2 } from "lucide-react";
import { VAULT_ABI, VAULT_ADDRESS } from "@/lib/contract";
import { OnChainPayment, useVault } from "@/hooks/useVault";
import clsx from "clsx";

function formatMUSD(val: string): string {
  const n = parseFloat(val);
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function formatInterval(seconds: number): string {
  if (seconds < 3600)   return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400)  return `${Math.round(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.round(seconds / 86400)}d`;
  if (seconds < 2592000)return `${Math.round(seconds / 604800)}w`;
  return `${Math.round(seconds / 2592000)}mo`;
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

interface CancelButtonProps {
  paymentId: number;
  onDone: () => void;
}

function CancelButton({ paymentId, onDone }: CancelButtonProps) {
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading } = useWaitForTransactionReceipt({ hash: txHash });

  const busy = isPending || isLoading;

  const handleCancel = () => {
    if (!VAULT_ADDRESS) return;
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: "cancelPayment",
      args: [BigInt(paymentId)],
    }, { onSuccess: onDone });
  };

  return (
    <button onClick={handleCancel} disabled={busy} className="btn-danger flex-shrink-0 flex items-center gap-1">
      {busy ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
      {busy ? "..." : "Cancel"}
    </button>
  );
}

interface Props {
  payments: OnChainPayment[];
  showCancelButton?: boolean;
}

export default function PaymentList({ payments, showCancelButton = true }: Props) {
  const { refetch } = useVault();

  if (payments.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
        <Clock size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No payments scheduled yet.</p>
        <p className="text-xs mt-1 opacity-60">Create your first recurring payment above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((p) => (
        <div
          key={p.id}
          className={clsx("vault-card flex items-center justify-between gap-4", !p.isActive && "opacity-50")}
        >
          {/* Icon */}
          <div className={clsx(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            p.isX402
              ? "bg-indigo-500/10 border border-indigo-500/20"
              : "bg-orange-500/10 border border-orange-500/20"
          )}>
            {p.isX402
              ? <Globe size={18} className="text-indigo-400" />
              : <Wallet size={18} className="text-orange-400" />}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white">{formatMUSD(p.amount)} MUSD</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>/ {formatInterval(p.interval)}</span>
              <span className={clsx(
                "badge",
                p.isX402
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
              )}>
                {p.isX402 ? "x402" : "Wallet"}
              </span>
              {!p.isActive && (
                <span className="badge bg-neutral-800 text-neutral-500 border border-neutral-700">Cancelled</span>
              )}
            </div>
            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
              {p.isX402 ? p.endpoint : shortenAddress(p.recipient)}
            </p>
          </div>

          {/* Next execution */}
          <div className="text-right flex-shrink-0 hidden sm:block">
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Next run</p>
            <p className={clsx("text-xs font-medium", p.isActive ? "text-emerald-400" : "text-neutral-600")}>
              {p.isActive ? p.nextExecution : "Inactive"}
            </p>
          </div>

          {/* Status / Cancel */}
          {p.isActive ? (
            showCancelButton
              ? <CancelButton paymentId={p.id} onDone={refetch} />
              : <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
          ) : (
            <XCircle size={18} className="text-neutral-600 flex-shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}
