import { Suspense } from 'react';
import { HomeDecorCircles } from '@/components/marketplace/HomeDecorCircles';
import { HomeHero } from '@/components/marketplace/HomeHero';
import { MarketplaceSection } from '@/components/marketplace/MarketplaceSection';
import { MarketplaceSkeleton } from '@/components/marketplace/MarketplaceSkeleton';

export const revalidate = 60;

export default function HomePage() {
  return (
    <div className="relative min-h-full bg-white">
      <HomeDecorCircles />
      <div className="relative z-10 mx-auto min-w-0 max-w-6xl px-4 py-6 sm:py-10">
        <HomeHero />

        <Suspense fallback={<MarketplaceSkeleton />}>
          <MarketplaceSection />
        </Suspense>
      </div>
    </div>
  );
}
