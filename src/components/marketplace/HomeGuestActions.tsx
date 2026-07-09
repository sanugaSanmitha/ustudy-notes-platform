'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useSellerNav } from '@/components/layout/NavAuthProvider';

export function HomeGuestActions() {
  const { isLoggedIn } = useSellerNav();

  if (isLoggedIn !== false) {
    return null;
  }

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Button asChild className="bg-blue-600 hover:bg-blue-700">
        <Link href="/register">Get started</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/login">Log in</Link>
      </Button>
    </div>
  );
}
