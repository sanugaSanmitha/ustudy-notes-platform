import { Card } from '@/components/ui/card';

export function MarketplaceSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div>
        <div className="mb-4 h-7 w-56 rounded bg-slate-200" />
        <Card className="h-56 bg-slate-100" />
      </div>
      <div>
        <div className="mb-4 h-7 w-40 rounded bg-slate-200" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 w-28 shrink-0 rounded-full bg-slate-200" />
          ))}
        </div>
      </div>
      <div>
        <div className="mb-4 h-7 w-52 rounded bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="h-48 bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-8">
      <div className="mb-6 h-4 w-32 rounded bg-slate-200" />
      <div className="mb-2 h-10 w-64 rounded bg-slate-200" />
      <div className="mb-8 h-6 w-96 max-w-full rounded bg-slate-200" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="h-40 bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
