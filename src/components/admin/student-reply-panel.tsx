'use client';

import { CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';

type StudentReply = {
  id: string;
  message: string;
  files?: Array<{ name?: string; type?: string; size?: number }> | null;
  created_at: string;
};

export function StudentReplyPanel({ replies }: { replies: StudentReply[] }) {
  if (replies.length === 0) {
    return null;
  }

  return (
    <Card className="border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-emerald-900">Student replied</h2>
          <p className="mt-1 text-xs text-emerald-800">
            The student submitted a response. Review their message and any uploaded files below.
          </p>
          <div className="mt-3 space-y-3">
            {replies.map((reply) => (
              <div key={reply.id} className="rounded-md border border-emerald-100 bg-white p-3">
                <p className="text-xs text-slate-500">{new Date(reply.created_at).toLocaleString()}</p>
                <p className="mt-1 text-sm text-slate-800">{reply.message}</p>
                {Array.isArray(reply.files) && reply.files.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {reply.files.map((file) => (
                      <li key={`${reply.id}-${file.name}-${file.size}`}>
                        {file.name}
                        {file.type ? ` (${file.type})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
