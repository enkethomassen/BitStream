"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function WalletConnect() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
            })}
          >
            {!connected ? (
              <button
                onClick={openConnectModal}
                className="btn-primary"
                style={{ padding: "12px 22px", fontSize: "14px", borderRadius: "100px" }}
              >
                Connect Wallet
              </button>
            ) : chain.unsupported ? (
              <button
                onClick={openChainModal}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "10px 18px", borderRadius: "100px",
                  fontSize: "13px", fontWeight: 600,
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.28)",
                  color: "#ef4444",
                  cursor: "pointer",
                }}
              >
                Wrong network
              </button>
            ) : (
              <button
                onClick={openAccountModal}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "10px 18px", borderRadius: "100px",
                  fontSize: "13px", fontWeight: 500, cursor: "pointer",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border-base)",
                  color: "var(--text-secondary)",
                  transition: "all 160ms ease",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-hi)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-base)"; }}
              >
                <span
                  style={{
                    width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                    background: "#22c55e",
                    boxShadow: "0 0 0 0 rgba(34,197,94,0.5)",
                    animation: "pulse-live 2.4s ease-in-out infinite",
                  }}
                />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-primary)" }}>
                  {account.displayName}
                </span>
                {account.displayBalance && (
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    · {account.displayBalance}
                  </span>
                )}
              </button>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
