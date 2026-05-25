import dynamic from 'next/dynamic';

// Disable SSR for the entire app — wagmi/RainbowKit hooks require browser context.
const AppClient = dynamic(() => import('./AppClient'), { ssr: false });

export default function Page() {
  return <AppClient />;
}
