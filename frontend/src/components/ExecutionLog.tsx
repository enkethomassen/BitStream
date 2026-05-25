"use client";
import { CheckCircle2, XCircle, Wallet, Globe, ExternalLink } from "lucide-react";
import { ExecutionLogEntry, formatMUSD, shortenAddress } from "@/lib/api";
import clsx from "clsx";

const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer.matsnet.mezo.org";

function txExplorerUrl(txHash: string): string {
  return `${EXPLORER_URL}/tx/${txHash}`;
}

interface Props {
  log: ExecutionLogEntry[];
  loading?: boolean;
}

export default function ExecutionLog({ log, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "var(--bg-raised)", border: "1px solid var(--border)" }} />
        ))}
      </div>
    );
  }

  if (log.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No executions yet. Trigger the scheduler to see activity.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {log.map((entry, i) => (
        <div
          key={i}
          className={clsx(
            "flex items-center gap-3 px-4 py-3 rounded-lg border text-sm animate-fade-in",
            entry.success
              ? "bg-green-500/5 border-green-500/15"
              : "bg-red-500/5 border-red-500/15"
          )}
        >
          {entry.success ? (
            <CheckCircle2 size={16} className="text-green-400 flex-shrink-0" />
          ) : (
            <XCircle size={16} className="text-red-400 flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {entry.type === "x402" ? (
                <Globe size={12} className="text-blue-400" />
              ) : (
                <Wallet size={12} className="text-orange-400" />
              )}
              <span className="font-medium text-white">
                {formatMUSD(entry.amount)} MUSD
              </span>
              <span className={clsx(
                "badge text-[10px]",
                entry.type === "x402"
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : "bg-orange-500/10 text-orange-400 border border-orange-500/20"
              )}>
                {entry.type === "x402" ? "x402" : "Wallet"}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {entry.error || (entry.txHash ? `tx: ${shortenAddress(entry.txHash)}` : "Success")}
            </p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleTimeString()}</p>
            {entry.txHash && (
              <a
                href={txExplorerUrl(entry.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-orange-400/70 hover:text-orange-400 flex items-center gap-0.5 justify-end mt-0.5"
              >
                <ExternalLink size={9} />
                View
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
