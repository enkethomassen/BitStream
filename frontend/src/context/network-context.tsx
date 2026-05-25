"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type MezoNetwork = "mainnet" | "testnet";

export interface NetworkConfig {
  id: number;
  name: string;
  rpc: string;
  explorer: string;
  chainLabel: string;
  testnet: boolean;
}

export const MEZO_NETWORKS: Record<MezoNetwork, NetworkConfig> = {
  mainnet: {
    id: 31612,
    name: "Mezo Mainnet",
    rpc:
      process.env.NEXT_PUBLIC_MAINNET_RPC ||
      "https://rpc.mezo.org",
    explorer:
      process.env.NEXT_PUBLIC_MAINNET_EXPLORER ||
      "https://explorer.mezo.org",
    chainLabel: "Mainnet",
    testnet: false,
  },
  testnet: {
    id: 31611,
    name: "Mezo Matsnet",
    rpc:
      process.env.NEXT_PUBLIC_TESTNET_RPC ||
      "https://rpc.matsnet.mezo.org",
    explorer:
      process.env.NEXT_PUBLIC_TESTNET_EXPLORER ||
      "https://explorer.matsnet.mezo.org",
    chainLabel: "Testnet",
    testnet: true,
  },
};

interface NetworkContextValue {
  network: MezoNetwork;
  config: NetworkConfig;
  setNetwork: (n: MezoNetwork) => Promise<void>;
  isSwitching: boolean;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);
const STORAGE_KEY = "bitstream-network";

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [network, setNetworkState] = useState<MezoNetwork>("testnet");
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "mainnet" || stored === "testnet") {
      setNetworkState(stored);
    }
  }, []);

  const setNetwork = async (next: MezoNetwork) => {
    if (next === network) return;
    setIsSwitching(true);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      window.dispatchEvent(
        new CustomEvent("bitstream:network-reset", {
          detail: { from: network, to: next },
        })
      );
      setNetworkState(next);
    } finally {
      setIsSwitching(false);
    }
  };

  const config = MEZO_NETWORKS[network];

  const value = useMemo(
    () => ({ network, config, setNetwork, isSwitching }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network, isSwitching]
  );

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error("useNetwork must be used within NetworkProvider");
  return ctx;
}
