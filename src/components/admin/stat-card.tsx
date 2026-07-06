import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type StatCardProps = {
  label: string;
  value: number | string;
  accent?: 'neutral' | 'green' | 'red' | 'amber';
  onClick?: () => void;
};

const ACCENT_STYLES = {
  neutral: 'border-l-slate-300',
  green: 'border-l-emerald-500',
  red: 'border-l-red-500',
  amber: 'border-l-amber-500',
};

export function StatCard({ label, value, accent = 'neutral', onClick }: StatCardProps) {
  const content = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </>
  );

  const className = cn(
    'border-l-4 bg-white p-4 text-left',
    ACCENT_STYLES[accent],
    onClick && 'cursor-pointer transition-shadow hover:shadow-md'
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(className, 'w-full rounded-xl ring-1 ring-foreground/10')}>
        {content}
      </button>
    );
  }

  return <Card className={className}>{content}</Card>;
}
