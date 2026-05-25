/**
 * wagmi.ts — Mezo chain definitions + wagmi config
 * Supports Mezo Mainnet and Matsnet (testnet)
 */
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

export const mezoMainnet = defineChain({
  id: 31612,
  name: "Mezo",
  nativeCurrency: { name: "BTC", symbol: "BTC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_MAINNET_RPC || "https://rpc.mezo.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Mezo Explorer",
      url:
        process.env.NEXT_PUBLIC_MAINNET_EXPLORER ||
        "https://explorer.mezo.org",
    },
  },
  testnet: false,
});

export const mezoTestnet = defineChain({
  id: 31611,
  name: "Mezo Matsnet",
  nativeCurrency: { name: "BTC", symbol: "BTC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_TESTNET_RPC ||
          "https://rpc.matsnet.mezo.org",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Mezo Matsnet Explorer",
      url:
        process.env.NEXT_PUBLIC_TESTNET_EXPLORER ||
        "https://explorer.matsnet.mezo.org",
    },
  },
  testnet: true,
});

// Keep backward-compat alias
export const mezoChain = mezoTestnet;

// Use real WalletConnect project ID when available, otherwise use a dev-safe
// fallback that avoids the 403 from api.web3modal.org for "placeholder".
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID &&
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID !== "placeholder"
    ? process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
    : "3fbb6bba6f1de962d911bb5b5c9dba87"; // WalletConnect public demo project ID

export const wagmiConfig = getDefaultConfig({
  appName: "Bitstream",
  projectId,
  chains: [mezoTestnet, mezoMainnet],
  ssr: true,
});
