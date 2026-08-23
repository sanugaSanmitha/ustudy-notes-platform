'use client';

import { useEffect } from 'react';

/** Ensures admin/support portals stay English-only (html lang + no zh-CN leakage). */
export function AdminEnglishScope({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.lang = 'en';
  }, []);

  return children;
}
