/**
 * wallet.ts — Re-exports wagmi hooks used throughout the app.
 * Real wallet state comes from wagmi's useAccount hook.
 */
export { useAccount, useDisconnect, useChainId } from "wagmi";
