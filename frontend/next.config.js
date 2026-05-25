const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
    NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE || "true",
  },
  webpack(config) {
    // Only include local node_modules — never climb to monorepo root on Vercel
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      'node_modules',
    ];

    // Stub unused / optional connectors and peer deps that cause compile errors
    const stubs = [
      'porto',
      'porto/internal',
      '@base-org/account',
      '@coinbase/wallet-sdk',
      '@metamask/connect-evm',
      '@safe-global/safe-apps-sdk',
      '@safe-global/safe-apps-provider',
      '@react-native-async-storage/async-storage',
      'pino-pretty',
      'accounts',
    ];
    stubs.forEach((mod) => {
      config.resolve.alias[mod] = false;
    });

    // Force key packages to always resolve from frontend's own node_modules
    const localPkgs = ['lucide-react', 'viem', 'wagmi', 'ox', '@noble/hashes', '@scure/bip32'];
    localPkgs.forEach((pkg) => {
      const pkgPath = path.resolve(__dirname, 'node_modules', pkg);
      try {
        require.resolve(pkgPath);
        config.resolve.alias[pkg] = pkgPath;
      } catch (_) {}
    });

    return config;
  },
};

module.exports = nextConfig;
