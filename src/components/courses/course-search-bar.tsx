'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function CourseSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      router.push('/courses');
      return;
    }
    router.push(`/courses?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by course code or title (e.g. COMP2011)"
            className="rounded-xl py-3 pl-10 pr-4"
          />
        </div>
        <Button type="submit" className="bg-blue-600 px-5 hover:bg-blue-700">
          Search
        </Button>
      </div>
      <p className="text-sm text-slate-400">Browse all 3,700+ HKUST undergraduate and postgraduate courses.</p>
    </form>
  );
}
