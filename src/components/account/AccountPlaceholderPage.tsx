import { Card } from '@/components/ui/card';

export default function AccountPlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      <Card className="mt-6 p-6">
        <p className="text-sm text-slate-600">{description}</p>
      </Card>
    </div>
  );
}
