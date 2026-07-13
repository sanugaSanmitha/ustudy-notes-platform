import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CartPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900">Cart</h1>
      <p className="mt-2 text-slate-600">Review note listings before checkout.</p>

      <Card className="mt-6 flex flex-col items-center justify-center border-dashed px-6 py-16 text-center">
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-blue-50 text-2xl">
          🛒
        </div>
        <h2 className="text-lg font-medium text-slate-900">Your cart is empty</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Browse course notes and add materials here when checkout is enabled.
        </p>
        <Button asChild className="mt-6 bg-blue-600 hover:bg-blue-700">
          <Link href="/courses">Browse courses</Link>
        </Button>
      </Card>
    </div>
  );
}
