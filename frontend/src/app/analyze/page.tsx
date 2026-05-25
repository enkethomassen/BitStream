import dynamic from 'next/dynamic';

const AnalyzePage = dynamic(() => import('@/components/AnalyzePage'), { ssr: false });

export default function Page() {
  return <AnalyzePage />;
}
