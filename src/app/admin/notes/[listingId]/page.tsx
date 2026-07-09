'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Download, FileArchive, X } from 'lucide-react';
import { AdminShell } from '@/components/admin/admin-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { adminFetch } from '@/lib/api/admin-client';
import type { AdminNoteListingDetail } from '@/lib/notes/admin-notes';
import { NOTE_REJECT_REASON_OPTIONS, noteRejectReasonLabel } from '@/lib/notes/reject-reasons';
import { cn } from '@/lib/utils';

type ConfirmAction = 'approve' | 'reject' | null;

export default function AdminNoteReviewDetailPage() {
  const params = useParams<{ listingId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [listing, setListing] = useState<AdminNoteListingDetail | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadUrlError, setDownloadUrlError] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successNextId, setSuccessNextId] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/notes/${params.listingId}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(result?.error?.message || 'Failed to load note listing.');
        return;
      }

      const payload = result?.data?.listing || null;
      setListing(payload);
      setDownloadUrl(result?.data?.downloadUrl || null);
      setDownloadUrlError(result?.data?.downloadUrlError || null);
      setReadOnly(Boolean(result?.data?.readOnly));
      setAdminNotes(payload?.adminNotes || '');
      setRejectReason(payload?.rejectReason || '');
      setRejectComment(payload?.rejectComment || '');
    } catch {
      setError('Unable to load note listing.');
    } finally {
      setLoading(false);
    }
  }, [params.listingId]);

  useEffect(() => {
    if (params.listingId) {
      void fetchDetail();
    }
  }, [params.listingId, fetchDetail]);

  const handleDownload = async () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
      return;
    }

    setDownloading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/notes/${params.listingId}/download`, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) {
        setError(result?.error?.message || 'Download failed.');
        return;
      }
      if (result?.data?.downloadUrl) {
        window.open(result.data.downloadUrl, '_blank');
      }
    } catch {
      setError('Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  const submitReview = async (action: 'approve' | 'reject') => {
    setSaving(true);
    setError('');
    try {
      const response = await adminFetch(`/api/admin/notes/${params.listingId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          adminNotes: action === 'approve' ? adminNotes.trim() || undefined : undefined,
          rejectReason: action === 'reject' ? rejectReason : undefined,
          rejectComment: action === 'reject' ? rejectComment.trim() : undefined,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(result?.error?.message || 'Review action failed.');
        return;
      }

      setConfirmAction(null);
      setShowSuccess(true);
      setSuccessNextId(result?.data?.nextPendingId || null);
      await fetchDetail();
    } finally {
      setSaving(false);
    }
  };

  const statusBadgeClass =
    listing?.status === 'pending_review'
      ? 'bg-amber-100 text-amber-800'
      : listing?.status === 'published'
        ? 'bg-emerald-100 text-emerald-800'
        : 'bg-red-100 text-red-700';

  return (
    <AdminShell
      title="Review Note Listing"
      description="Inspect listing details, download the ZIP, and publish or reject."
      actions={
        <Link
          href="/admin/notes"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'inline-flex items-center')}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to queue
        </Link>
      }
    >
      {loading ? (
        <p className="text-sm text-slate-600">Loading listing...</p>
      ) : !listing ? (
        <Card className="p-8 text-center text-sm text-slate-600">Note listing not found.</Card>
      ) : (
        <>
          {error && <Card className="mb-6 border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</Card>}

          {showSuccess && (
            <Card className="mb-6 border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-medium">
                Listing {listing.status === 'published' ? 'published' : 'rejected'} successfully.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {successNextId ? (
                  <Button type="button" size="sm" onClick={() => router.push(`/admin/notes/${successNextId}`)}>
                    Review next pending
                  </Button>
                ) : null}
                <Link href="/admin/notes" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                  Back to queue
                </Link>
              </div>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{listing.courseCode}</p>
                    <h2 className="mt-1 text-2xl font-bold text-slate-900">{listing.title}</h2>
                    {listing.courseTitle && <p className="mt-1 text-slate-600">{listing.courseTitle}</p>}
                  </div>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-medium', statusBadgeClass)}>
                    {listing.status === 'pending_review'
                      ? 'Pending Review'
                      : listing.status === 'published'
                        ? 'Published'
                        : 'Rejected'}
                  </span>
                </div>

                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Semester</dt>
                    <dd className="font-medium text-slate-900">
                      {listing.semester} {listing.academicYear}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Price</dt>
                    <dd className="font-medium text-slate-900">HK${listing.priceHkd.toFixed(0)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Language</dt>
                    <dd className="font-medium text-slate-900">{listing.language}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Verified grade</dt>
                    <dd className="font-medium text-slate-900">{listing.verifiedGrade || 'Unknown'}</dd>
                  </div>
                  {listing.professor && (
                    <div>
                      <dt className="text-slate-500">Professor</dt>
                      <dd className="font-medium text-slate-900">{listing.professor}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-slate-500">Submitted</dt>
                    <dd className="font-medium text-slate-900">{new Date(listing.createdAt).toLocaleString()}</dd>
                  </div>
                </dl>

                {listing.description && (
                  <div className="mt-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Description</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{listing.description}</p>
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">ZIP contents</h3>
                    <p className="text-sm text-slate-500">
                      {listing.zipFilename} · {(listing.zipSizeBytes / 1024 / 1024).toFixed(2)} MB ·{' '}
                      {listing.fileCount} files
                    </p>
                  </div>
                  <Button type="button" size="sm" onClick={() => void handleDownload()} disabled={downloading}>
                    <Download className="mr-1 size-4" />
                    {downloading ? 'Preparing...' : 'Download ZIP'}
                  </Button>
                </div>

                {downloadUrlError && <p className="mt-3 text-sm text-amber-700">{downloadUrlError}</p>}

                {listing.materialTags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {listing.materialTags.map((tag) => (
                      <span key={tag} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {listing.fileNames.length > 0 ? (
                  <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-3">
                    {listing.fileNames.map((fileName) => (
                      <li key={fileName} className="truncate text-sm text-slate-600">
                        • {fileName}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">No file names were captured for this listing.</p>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-5">
                <h3 className="font-semibold text-slate-900">Seller</h3>
                <p className="mt-2 text-sm text-slate-700">{listing.userName || 'Unknown seller'}</p>
                {listing.userEmail && <p className="text-sm text-slate-500">{listing.userEmail}</p>}
                <Link
                  href={`/admin/users/${listing.userId}`}
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-4 inline-flex')}
                >
                  View seller profile
                </Link>
              </Card>

              {readOnly ? (
                <Card className="p-5">
                  <h3 className="font-semibold text-slate-900">Review outcome</h3>
                  {listing.reviewerName && (
                    <p className="mt-2 text-sm text-slate-600">
                      Reviewed by {listing.reviewerName}
                      {listing.reviewedAt ? ` · ${new Date(listing.reviewedAt).toLocaleString()}` : ''}
                    </p>
                  )}
                  {listing.status === 'rejected' && listing.rejectReason && (
                    <p className="mt-3 text-sm text-slate-700">
                      <span className="font-medium">Reason:</span> {noteRejectReasonLabel(listing.rejectReason)}
                    </p>
                  )}
                  {listing.rejectComment && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{listing.rejectComment}</p>
                  )}
                  {listing.adminNotes && (
                    <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                      <span className="font-medium">Admin notes:</span> {listing.adminNotes}
                    </p>
                  )}
                </Card>
              ) : (
                <Card className="p-5">
                  <h3 className="font-semibold text-slate-900">Moderation</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Download and inspect the ZIP before publishing. Rejections require a reason and comment.
                  </p>

                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="admin-notes" className="text-sm font-medium text-slate-700">
                        Notes to seller (optional, on approve)
                      </Label>
                      <textarea
                        id="admin-notes"
                        value={adminNotes}
                        onChange={(event) => setAdminNotes(event.target.value.slice(0, 1000))}
                        rows={3}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Optional message included in the approval email"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button
                        type="button"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setConfirmAction('approve')}
                        disabled={saving}
                      >
                        <Check className="mr-2 size-4" />
                        Publish listing
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => setConfirmAction('reject')}
                        disabled={saving}
                      >
                        <X className="mr-2 size-4" />
                        Reject listing
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              <p className="flex items-center gap-2 text-xs text-slate-500">
                <FileArchive className="size-4" />
                Published listings appear on the homepage and course pages.
              </p>
            </div>
          </div>

          {confirmAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
              <Card className="w-full max-w-md p-5">
                <h3 className="text-lg font-semibold text-slate-900">
                  {confirmAction === 'approve' ? 'Publish this listing?' : 'Reject this listing?'}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {confirmAction === 'approve'
                    ? 'Buyers will be able to discover and purchase these notes immediately.'
                    : 'The seller will receive an email with your rejection reason.'}
                </p>

                {confirmAction === 'reject' && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <Label htmlFor="reject-reason" className="text-sm font-medium text-slate-700">
                        Reject reason
                      </Label>
                      <select
                        id="reject-reason"
                        value={rejectReason}
                        onChange={(event) => setRejectReason(event.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">Select a reason</option>
                        {NOTE_REJECT_REASON_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="reject-comment" className="text-sm font-medium text-slate-700">
                        Comment to seller
                      </Label>
                      <textarea
                        id="reject-comment"
                        value={rejectComment}
                        onChange={(event) => setRejectComment(event.target.value.slice(0, 1000))}
                        rows={4}
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Explain what needs to change (min. 10 characters)"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-5 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setConfirmAction(null)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant={confirmAction === 'approve' ? 'default' : 'destructive'}
                    className={confirmAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : undefined}
                    disabled={
                      saving ||
                      (confirmAction === 'reject' && (!rejectReason || rejectComment.trim().length < 10))
                    }
                    onClick={() => void submitReview(confirmAction)}
                  >
                    {saving ? 'Saving...' : confirmAction === 'approve' ? 'Confirm publish' : 'Confirm reject'}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
