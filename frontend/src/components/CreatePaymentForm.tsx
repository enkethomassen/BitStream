"use client";
import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from "wagmi";
import { parseUnits } from "viem";
import { Wallet, Globe, Plus, Info, Loader2 } from "lucide-react";
import { VAULT_ABI, VAULT_ADDRESS } from "@/lib/contract";
import { useVault } from "@/hooks/useVault";
import { apiExtra } from "@/lib/api";
import clsx from "clsx";

const INTERVAL_OPTIONS = [
  { label: "Every minute (test)", value: 60 },
  { label: "Hourly",              value: 3600 },
  { label: "Daily",               value: 86400 },
  { label: "Weekly",              value: 604800 },
  { label: "Monthly",             value: 2592000 },
];

interface FormState {
  recipient: string;
  amount: string;
  interval: number;
  isX402: boolean;
  endpoint: string;
}

interface Props {
  onSuccess?: () => void;
}

export default function CreatePaymentForm({ onSuccess }: Props) {
  const { address } = useAccount();
  const { musdBalance, refetch } = useVault();
  const isDemoMode = !VAULT_ADDRESS;

  const [isX402, setIsX402] = useState(false);
  const [form, setForm]     = useState<FormState>({
    recipient: "",
    amount: "",
    interval: 2592000,
    isX402: false,
    endpoint: "",
  });
  const [formError, setFormError]     = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  // Handle on-chain success
  if (isSuccess && onSuccess) {
    refetch();
    onSuccess();
  }

  // Validate inputs
  function validate(): string | null {
    if (!address)                                          return "Connect your wallet first.";
    if (!form.amount || parseFloat(form.amount) <= 0)     return "Enter a valid MUSD amount.";
    if (parseFloat(form.amount) > parseFloat(musdBalance || "0"))
                                                           return "Amount exceeds your available MUSD balance.";
    if (!isX402 && !form.recipient)                        return "Recipient wallet address is required.";
    if (!isX402 && !/^0x[0-9a-fA-F]{40}$/.test(form.recipient))
                                                           return "Invalid Ethereum address.";
    if (isX402 && !form.endpoint)                          return "x402 endpoint URL is required.";
    if (isX402 && !form.endpoint.startsWith("http"))       return "x402 endpoint must be a valid URL.";
    return null;
  }

  // Demo mode: create via backend API
  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const err = validate();
    if (err) return setFormError(err);

    setDemoLoading(true);
    try {
      await apiExtra.createPayment({
        address: address!,
        recipient: isX402 ? undefined : form.recipient,
        amount: form.amount,
        interval: form.interval,
        isX402,
        endpoint: isX402 ? form.endpoint : undefined,
      });
      setDemoSuccess(true);
      refetch();
      setTimeout(() => {
        setDemoSuccess(false);
        onSuccess?.();
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || "Failed to create payment");
    } finally {
      setDemoLoading(false);
    }
  };

  // Live mode: schedule on-chain via wagmi
  const handleOnChainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const err = validate();
    if (err) return setFormError(err);

    if (!VAULT_ADDRESS) return setFormError("Vault contract address not configured. Set NEXT_PUBLIC_VAULT_ADDRESS.");

    const amountWei = parseUnits(form.amount, 18);
    const recipient = isX402
      ? ("0x0000000000000000000000000000000000000000" as `0x${string}`)
      : (form.recipient as `0x${string}`);

    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: "schedulePayment",
      args: [recipient, amountWei, BigInt(form.interval), isX402, isX402 ? form.endpoint : ""],
    });
  };

  const handleSubmit = isDemoMode ? handleDemoSubmit : handleOnChainSubmit;
  const busy = isPending || isConfirming || demoLoading;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {isDemoMode && (
        <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-3"
          style={{ background: "rgba(249,115,22,0.05)", border: "1px solid rgba(249,115,22,0.16)" }}>
          <Info size={13} className="text-orange-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs leading-relaxed" style={{ color: "rgba(249,180,100,0.7)" }}>
            Demo mode — payments are stored in the backend agent. Connect to Mezo Matsnet and set{" "}
            <span className="font-mono text-orange-300">NEXT_PUBLIC_VAULT_ADDRESS</span> for on-chain scheduling.
          </p>
        </div>
      )}

      {/* Payment type */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
          Payment Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setIsX402(false)}
            className={clsx(
              "flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all",
              !isX402
                ? "text-orange-400 border-orange-500/40 bg-orange-500/8"
                : "text-neutral-400 border-neutral-700 bg-neutral-800/50 hover:border-neutral-600"
            )}>
            <Wallet size={14} />
            Wallet Transfer
          </button>
          <button type="button" onClick={() => setIsX402(true)}
            className={clsx(
              "flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all",
              isX402
                ? "text-indigo-400 border-indigo-500/40 bg-indigo-500/8"
                : "text-neutral-400 border-neutral-700 bg-neutral-800/50 hover:border-neutral-600"
            )}>
            <Globe size={14} />
            x402 API Payment
          </button>
        </div>
      </div>

      {isX402 && (
        <div className="flex items-start gap-2.5 rounded-lg px-3.5 py-3"
          style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.16)" }}>
          <Info size={13} className="text-indigo-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs leading-relaxed" style={{ color: "rgba(165,164,240,0.6)" }}>
            x402 payments are executed by the backend agent via HTTP 402 protocol. The vault deducts MUSD automatically.
          </p>
        </div>
      )}

      {/* Recipient / Endpoint */}
      {!isX402 ? (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
            Recipient Address
          </label>
          <input type="text" className="vault-input font-mono" placeholder="0x..."
            value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} />
          <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>e.g. landlord wallet, subscription recipient</p>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
            x402 Endpoint URL
          </label>
          <input type="url" className="vault-input" placeholder="https://api.service.com/premium"
            value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} />
          <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>The API endpoint that accepts x402 MUSD payments</p>
        </div>
      )}

      {/* Amount */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
          Amount
        </label>
        <div className="relative">
          <input type="number" step="0.01" min="0.01" className="vault-input pr-16" placeholder="100.00"
            value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            MUSD
          </span>
        </div>
        <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
          Balance: {parseFloat(musdBalance || "0").toLocaleString()} MUSD available
        </p>
      </div>

      {/* Interval */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
          Frequency
        </label>
        <select className="vault-input" value={form.interval}
          onChange={(e) => setForm({ ...form, interval: parseInt(e.target.value) })}>
          {INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {formError && (
        <div className="rounded-lg px-3.5 py-2.5 text-xs"
          style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
          {formError}
        </div>
      )}

      {(isSuccess || demoSuccess) && (
        <div className="rounded-lg px-3.5 py-2.5 text-xs"
          style={{ background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.18)", color: "#4ade80" }}>
          Payment scheduled {isDemoMode ? "in backend agent" : "on-chain"} ✓
        </div>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        {demoLoading     ? "Scheduling…"        :
         isPending       ? "Confirm in wallet…" :
         isConfirming    ? "Confirming…"         : "Schedule Payment"}
      </button>
    </form>
  );
}
