import { Suspense } from 'react';
import NotesUploadPage from './NotesUploadClient';

export default function NotesUploadRoutePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-8 text-slate-600">Loading...</div>}>
      <NotesUploadPage />
    </Suspense>
  );
}
