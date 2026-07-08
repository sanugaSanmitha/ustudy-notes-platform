'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';
import { MAX_STUDENT_REPLY_FILES } from '@/lib/grades/student-reply';

type WaitingForInfoProps = {
  requestId: string;
  reviewerMessage: string;
  onSubmitted: () => void | Promise<void>;
};

export function WaitingForInfo({ requestId, reviewerMessage, onSubmitted }: WaitingForInfoProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!message.trim() && files.length === 0) {
      setError('Please provide a message or upload at least one file.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('message', message.trim());
      for (const file of files) {
        formData.append('files', file);
      }

      const response = await fetch(`/api/grades/admin-review/${requestId}/reply`, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error?.message || 'Failed to submit your reply.');
        return;
      }

      setMessage('');
      setFiles([]);
      await onSubmitted();
    } catch (submitError) {
      console.error('Student reply submit error:', submitError);
      setError('Unable to submit your reply right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-start gap-3">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-amber-900">Additional information required</h3>
          <p className="mt-1 text-sm text-amber-800">
            Your reviewer needs more information before they can continue. Please respond below.
          </p>
          <div className="mt-3 rounded-md border border-amber-100 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Reviewer request</p>
            <p className="mt-1 text-sm text-slate-800">{reviewerMessage}</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="student-reply-message" className="text-sm text-amber-900">
                Your reply
              </Label>
              <textarea
                id="student-reply-message"
                rows={4}
                className="mt-1 block w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="Provide the requested information or clarification…"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
              />
            </div>

            <div>
              <Label htmlFor="student-reply-files" className="text-sm text-amber-900">
                Upload additional files (optional)
              </Label>
              <input
                id="student-reply-files"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="mt-1 block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-amber-800 hover:file:bg-amber-200"
                onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, MAX_STUDENT_REPLY_FILES))}
              />
              <p className="mt-1 text-xs text-amber-700">
                PDF, JPG, or PNG · up to {MAX_STUDENT_REPLY_FILES} files · a new PDF replaces your transcript for review
              </p>
              {files.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-slate-700">
                  {files.map((file) => (
                    <li key={`${file.name}-${file.size}`}>{file.name}</li>
                  ))}
                </ul>
              )}
            </div>

            {error && <p className="text-sm text-red-700">{error}</p>}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {isSubmitting ? 'Submitting…' : 'Submit reply'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
