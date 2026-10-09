'use client';

import dynamic from 'next/dynamic';

// Three.js needs the browser, so the scene is never rendered on the server.
const AbujaCityScene = dynamic(() => import('@/components/AbujaCityScene'), { ssr: false });

export default function CityPreview() {
  return (
    <main style={{ width: '100%', height: '100dvh' }}>
      <AbujaCityScene />
    </main>
  );
}
