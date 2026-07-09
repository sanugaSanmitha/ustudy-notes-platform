'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  BarChart3,
  ClipboardList,
  FileText,
  RefreshCw,
  ScrollText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type QuickActionsPanelProps = {
  onRefresh?: () => void;
  refreshing?: boolean;
};

const actionLinkClass = cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex items-center justify-start');

export function QuickActionsPanel({ onRefresh, refreshing }: QuickActionsPanelProps) {
  return (
    <Card className="bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Quick Actions</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Link href="/admin/grades" className={actionLinkClass}>
          <FileText className="mr-2 h-4 w-4" />
          Verification Queue
        </Link>
        <Link href="/admin/support" className={actionLinkClass}>
          <ClipboardList className="mr-2 h-4 w-4" />
          Support Queue
        </Link>
        <Link href="/admin/audit" className={actionLinkClass}>
          <ScrollText className="mr-2 h-4 w-4" />
          Audit Log
        </Link>
        <Link href="/admin/summary" className={actionLinkClass}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Summary
        </Link>
        {onRefresh && (
          <Button type="button" variant="outline" size="sm" className="justify-start" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
            Refresh Dashboard
          </Button>
        )}
      </div>
    </Card>
  );
}
