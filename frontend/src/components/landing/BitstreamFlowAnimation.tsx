'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const BitstreamFlowScene = dynamic(
  () => import('./BitstreamFlowScene').then(m => m.BitstreamFlowScene),
  { ssr: false }
);

function LoadingFallback() {
  return (
    <div className="flex h-full w-full items-end justify-start p-4" style={{ minHeight: 520 }}>
      <div className="space-y-2 w-full">
        <div className="flex gap-1.5 mb-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-1 h-10 rounded-xl animate-pulse"
              style={{ background: 'rgba(247,147,26,0.06)', animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 rounded-xl animate-pulse"
            style={{ background: 'rgba(247,147,26,0.03)', animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
    </div>
  );
}

export function BitstreamFlowAnimation() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BitstreamFlowScene />
    </Suspense>
  );
}
