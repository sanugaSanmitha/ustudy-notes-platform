'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Camera, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ProfileAvatarButtonProps = {
  initials: string;
  avatarUrl?: string | null;
  size?: 'nav' | 'drawer';
  onUploaded?: (avatarUrl: string) => void;
};

export function ProfileAvatarButton({
  initials,
  avatarUrl,
  size = 'drawer',
  onUploaded,
}: ProfileAvatarButtonProps) {
  const menuId = useId();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const displayUrl = previewUrl || avatarUrl || null;
  const sizeClassName =
    size === 'nav'
      ? 'h-[57px] w-[64px] text-xs'
      : 'h-[88px] w-[91px] text-[20px] sm:h-[111px] sm:w-[114px] sm:text-[24px]';

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [menuOpen]);

  const uploadFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setUploading(true);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/auth/profile/avatar', {
        method: 'POST',
        body,
        credentials: 'same-origin',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPreviewUrl(avatarUrl || null);
        setError(result.error?.message || 'Failed to upload photo.');
        return;
      }
      const nextUrl = result.data?.avatarUrl as string | undefined;
      if (nextUrl) {
        setPreviewUrl(nextUrl);
        onUploaded?.(nextUrl);
      }
    } catch {
      setPreviewUrl(avatarUrl || null);
      setError('Unable to upload photo right now.');
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploading(false);
      setMenuOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        disabled={uploading}
        onClick={() => setMenuOpen((open) => !open)}
        className={cn(
          'relative overflow-hidden rounded-full bg-[#213f73] font-medium text-white ring-2 ring-transparent transition hover:ring-[#213f73]/30 focus-visible:outline-none focus-visible:ring-[#213f73]',
          sizeClassName
        )}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center">{initials || 'U'}</span>
        )}
        {uploading ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-[10px] text-white">
            Saving...
          </span>
        ) : null}
      </button>

      {menuOpen ? (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute z-20 mt-2 min-w-[180px] overflow-hidden rounded-[12px] border border-[#2a3e88]/20 bg-white shadow-lg',
            size === 'nav' ? 'right-0' : 'left-1/2 -translate-x-1/2'
          )}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-black hover:bg-[#edf0fc]"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera className="size-4 text-[#1f2f66]" />
            Take photo
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] text-black hover:bg-[#edf0fc]"
            onClick={() => galleryInputRef.current?.click()}
          >
            <ImageIcon className="size-4 text-[#1f2f66]" />
            Choose from gallery
          </button>
        </div>
      ) : null}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(event) => {
          void uploadFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          void uploadFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      {error ? <p className="mt-1 max-w-[125px] text-center text-[11px] text-red-600">{error}</p> : null}
    </div>
  );
}
