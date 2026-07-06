import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function GradeVerificationAccountPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">Grade Verification</h1>
      <p className="mt-2 text-slate-600">Verify your HKUST transcript to unlock seller features.</p>
      <Card className="mt-6 p-6">
        <div className="flex flex-wrap gap-3">
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
            <Link href="/grades/upload">Verify Seller</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/grades/status">View Verification Status</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
