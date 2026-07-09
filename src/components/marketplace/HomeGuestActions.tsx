'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

export function HomeGuestActions() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(Boolean(user));
    });
  }, []);

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
