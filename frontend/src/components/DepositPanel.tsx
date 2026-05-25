"use client";
import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { parseEther, parseUnits } from "viem";
import { Bitcoin, DollarSign, Loader2, ArrowDownToLine, Coins } from "lucide-react";
import { VAULT_ABI, VAULT_ADDRESS } from "@/lib/contract";
import { useVault } from "@/hooks/useVault";
import clsx from "clsx";

type Mode = "deposit" | "mint";

export default function DepositPanel() {
  const { address } = useAccount();
  const { collateral, musdBalance, refetch } = useVault();
  const [mode, setMode] = useState<Mode>("deposit");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  if (isSuccess) {
    refetch();
  }

  const busy = isPending || isConfirming;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!address)      return setError("Connect your wallet first.");
    if (!VAULT_ADDRESS) return setError("Vault address not configured. Set NEXT_PUBLIC_VAULT_ADDRESS.");
    if (!amount || parseFloat(amount) <= 0) return setError("Enter a valid amount.");

    if (mode === "deposit") {
      writeContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "depositCollateral",
        value: parseEther(amount),
      });
    } else {
      writeContract({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: "mintMUSD",
        args: [parseUnits(amount, 18)],
      });
    }
  };

  return (
    <div className="vault-card">
      <div className="flex items-center gap-1 mb-5 p-1 rounded-lg" style={{ background: "var(--bg-raised)" }}>
        {([["deposit", "Deposit BTC", Bitcoin], ["mint", "Mint MUSD", Coins]] as const).map(([m, label, Icon]) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(""); setAmount(""); }}
            className={clsx(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
              mode === m
                ? "bg-orange-500 text-white"
                : "text-neutral-400 hover:text-white"
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
            {mode === "deposit" ? "BTC Amount" : "MUSD to Mint"}
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.0001"
              min="0.0001"
              className="vault-input pr-16"
              placeholder={mode === "deposit" ? "0.5" : "1000.00"}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
              {mode === "deposit" ? "BTC" : "MUSD"}
            </span>
          </div>
          <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
            {mode === "deposit"
              ? `Current collateral: ${parseFloat(collateral).toFixed(4)} BTC`
              : `Collateral: ${parseFloat(collateral).toFixed(4)} BTC · MUSD balance: ${parseFloat(musdBalance).toFixed(2)}`}
          </p>
        </div>

        {error && (
          <div className="rounded-lg px-3.5 py-2.5 text-xs"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
            {error}
          </div>
        )}

        {isSuccess && (
          <div className="rounded-lg px-3.5 py-2.5 text-xs"
            style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.18)", color: "#4ade80" }}>
            {mode === "deposit" ? "Collateral deposited ✓" : "MUSD minted ✓"}
          </div>
        )}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 size={14} className="animate-spin" /> : mode === "deposit" ? <ArrowDownToLine size={14} /> : <DollarSign size={14} />}
          {isPending ? "Confirm in wallet…" : isConfirming ? "Confirming…" : mode === "deposit" ? "Deposit Collateral" : "Mint MUSD"}
        </button>
      </form>
    </div>
  );
}
