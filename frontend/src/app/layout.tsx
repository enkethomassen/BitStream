import type { Metadata } from "next";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import nextDynamic from "next/dynamic";

export const dynamic = 'force-dynamic';

// Providers touches WalletConnect internals that crash in Node SSR.
// Load it client-side only — children still stream normally.
const Providers = nextDynamic(
  () => import("./providers").then((m) => ({ default: m.Providers })),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Bitstream — Bitcoin-Backed Automated Cashflow Engine",
  description:
    "Lock BTC as collateral, mint MUSD, and automate recurring payments. Self-custodial cashflow infrastructure powered by Mezo.",
  keywords: ["Mezo", "Bitcoin", "MUSD", "DeFi", "x402", "stablecoin", "cashflow", "Bitstream"],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
