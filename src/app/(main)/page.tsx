import { Suspense } from 'react';
import { HomeGuestActions } from '@/components/marketplace/HomeGuestActions';
import { MarketplaceSection } from '@/components/marketplace/MarketplaceSection';
import { MarketplaceSkeleton } from '@/components/marketplace/MarketplaceSkeleton';

export const revalidate = 60;

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Find course notes from University students
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-500">
          Browse verified notes by course, semester, and grade. Buy securely and download instantly.
        </p>
        <HomeGuestActions />
      </section>

      <Suspense fallback={<MarketplaceSkeleton />}>
        <MarketplaceSection />
      </Suspense>
    </div>
  );
}
