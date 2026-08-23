'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { SCHOOL_OPTIONS, type SchoolOption } from '@/lib/profile/constants';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { UpdatePasswordForm } from '@/components/account/UpdatePasswordForm';
import { ProfileAvatarButton } from '@/components/account/ProfileAvatarButton';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { APP_LOCALES, LOCALE_LABELS } from '@/lib/i18n/types';

type ProfileData = {
  email: string;
  fullName?: string | null;
  school?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
};

function isSchoolOption(value: string | null | undefined): value is SchoolOption {
  return Boolean(value && (SCHOOL_OPTIONS as readonly string[]).includes(value));
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <span className={cn('relative size-[10px] shrink-0 overflow-clip', className)}>
      <img src="/icons/profile-pencil.svg" alt="" width={10} height={10} className="size-full" />
    </span>
  );
}

function ChevronIcon() {
  return (
    <span className="relative size-[15px] shrink-0 overflow-clip">
      <img src="/icons/profile-chevron.svg" alt="" width={15} height={15} className="size-full" />
    </span>
  );
}

function CloseIcon() {
  return (
    <span className="relative size-[25px] shrink-0 overflow-clip">
      <img src="/icons/profile-close.svg" alt="" width={25} height={25} className="size-full" />
    </span>
  );
}

export function ProfileDrawer({
  open,
  onClose,
  initials,
  avatarUrl: navbarAvatarUrl,
  initialEmail,
  initialFullName,
  onLogout,
  onProfileUpdated,
}: {
  open: boolean;
  onClose: () => void;
  initials: string;
  avatarUrl?: string | null;
  initialEmail?: string | null;
  initialFullName?: string | null;
  onLogout: () => void;
  onProfileUpdated?: () => void;
}) {
  const router = useRouter();
  const { locale, setLocale, t, localeLabel, themeLabel } = useLocale();
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [languageOpen, setLanguageOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const skipBlurSave = useRef(false);

  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
  }, []);

  const buildSeedProfile = useCallback((): ProfileData | null => {
    if (!initialEmail && !initialFullName) return null;
    return {
      email: initialEmail || '',
      fullName: initialFullName || null,
      school: null,
      avatarUrl: navbarAvatarUrl ?? null,
    };
  }, [initialEmail, initialFullName, navbarAvatarUrl]);

  const loadProfile = useCallback(
    async (options?: { background?: boolean }) => {
      if (!options?.background) {
        setLoading(true);
      }
      setLoadError('');
      try {
        const response = await fetch('/api/auth/profile', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          setLoadError(result.error?.message || t('loadProfileFailed'));
          return;
        }
        const data = result.data as ProfileData | undefined;
        if (!data) {
          setLoadError(t('profileMissing'));
          return;
        }
        setProfile(data);
        setFullName(data.fullName?.trim() || '');
      } catch {
        setLoadError(t('loadProfileUnexpected'));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!open) {
      setEditingName(false);
      setLanguageOpen(false);
      setThemeOpen(false);
      setNameError('');
      return;
    }

    const seeded = buildSeedProfile();
    if (seeded) {
      setProfile((current) => current ?? seeded);
      setFullName((current) => current || seeded.fullName?.trim() || '');
    }

    void loadProfile({ background: Boolean(seeded) });
  }, [open, loadProfile, buildSeedProfile]);

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const { style } = document.body;
    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.left = '0';
    style.right = '0';
    style.width = '100%';
    style.overflow = 'hidden';

    return () => {
      style.position = '';
      style.top = '';
      style.left = '';
      style.right = '';
      style.width = '';
      style.overflow = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const saveName = async () => {
    const activeProfile = profile ?? buildSeedProfile();
    if (!activeProfile) return;
    const nextName = fullName.trim();
    const currentName = activeProfile.fullName?.trim() || '';
    if (nextName === currentName) {
      setEditingName(false);
      setNameError('');
      return;
    }
    if (!nextName) {
      setNameError(t('fullNameRequired'));
      return;
    }
    if (!isSchoolOption(activeProfile.school)) {
      setNameError(t('schoolRequiredBeforeUsername'));
      return;
    }

    setSavingName(true);
    setNameError('');
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ fullName: nextName, school: activeProfile.school }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setNameError(result.error?.message || t('updateNameFailed'));
        return;
      }
      setProfile((current) => (current ? { ...current, fullName: nextName } : current));
      setEditingName(false);
      onProfileUpdated?.();
      router.refresh();
    } catch {
      setNameError(t('updateNameUnexpected'));
    } finally {
      setSavingName(false);
    }
  };

  if (!open || !mounted) return null;

  const visibleProfile = profile ?? buildSeedProfile();
  const showProfileSkeleton = loading && !visibleProfile;

  const memberSince = visibleProfile?.createdAt
    ? new Date(visibleProfile.createdAt).toLocaleDateString('en-US')
    : loading
      ? '…'
      : '—';

  return createPortal(
    <div className="fixed inset-0 z-[70] overflow-hidden overscroll-none">
      <button
        type="button"
        className="group fixed inset-0 cursor-default overflow-hidden"
        aria-label={t('closeProfile')}
        onClick={onClose}
      >
        <span className="absolute inset-0 bg-[rgba(217,217,217,0.2)] backdrop-blur-[21px] backdrop-saturate-[1.4]" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0.12)_32%,transparent_58%)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(315deg,rgba(237,240,252,0.22)_0%,transparent_42%)]"
        />
      </button>
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="fixed bottom-2 left-2 right-2 top-2 flex flex-col overflow-hidden rounded-[12px] bg-white shadow-[0_8px_32px_rgba(31,47,102,0.12)] outline-none sm:bottom-[14px] sm:left-auto sm:right-[14px] sm:top-[14px] sm:w-[min(388px,calc(100vw-28px))]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-[11px] top-4 z-10"
          aria-label={t('closeProfile')}
        >
          <CloseIcon />
        </button>

        <h2 id={titleId} className="sr-only">
          {t('profileTitle')}
        </h2>

        <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden px-5 pb-6 pt-12 sm:px-[31.5px] sm:pt-14">
          <div className="flex min-h-0 w-full max-w-[325px] flex-1 flex-col items-center">
          <ProfileAvatarButton
            initials={initials}
            avatarUrl={visibleProfile?.avatarUrl ?? navbarAvatarUrl}
            size="drawer"
            onUploaded={(nextUrl) => {
              setProfile((current) => (current ? { ...current, avatarUrl: nextUrl } : current));
              onProfileUpdated?.();
            }}
          />

            <div className="mt-8 w-full rounded-[11px] border border-[#2a3e88] bg-white px-[15px] py-3">
            {showProfileSkeleton ? (
              <div className="space-y-2">
                <div className="h-4 animate-pulse rounded bg-[#edf0fc]" />
                <div className="h-4 animate-pulse rounded bg-[#edf0fc]" />
                <div className="h-4 animate-pulse rounded bg-[#edf0fc]" />
                <div className="h-4 animate-pulse rounded bg-[#edf0fc]" />
              </div>
            ) : (
              <dl className="space-y-[2px] text-[12px] font-normal leading-[19px]">
                <div className="grid grid-cols-[88px_minmax(0,1fr)_10px] items-center gap-x-2">
                  <dt className="text-[#828282]">{t('username')}</dt>
                  <dd className="min-w-0 text-black">
                    {editingName ? (
                      <Input
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            void saveName();
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            event.stopPropagation();
                            skipBlurSave.current = true;
                            setEditingName(false);
                            setFullName(visibleProfile?.fullName?.trim() || '');
                            setNameError('');
                          }
                        }}
                        onBlur={() => {
                          if (skipBlurSave.current) {
                            skipBlurSave.current = false;
                            return;
                          }
                          void saveName();
                        }}
                        disabled={savingName}
                        className="h-[22px] rounded-none border-0 border-b border-black px-0 py-0 text-[12px] shadow-none focus-visible:ring-0"
                        autoFocus
                        dir="ltr"
                        lang="en"
                      />
                    ) : (
                      <span className="block truncate" dir="ltr" lang="en">
                        {visibleProfile?.fullName?.trim() || '—'}
                      </span>
                    )}
                  </dd>
                  <button
                    type="button"
                    className="flex size-[10px] items-center justify-center"
                    aria-label={editingName ? t('saveUsername') : t('editUsername')}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (editingName) {
                        void saveName();
                        return;
                      }
                      setEditingName(true);
                    }}
                  >
                    <PencilIcon />
                  </button>
                </div>
                <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-2">
                  <dt className="text-[#828282]">{t('email')}</dt>
                  <dd className="truncate text-black/70" dir="ltr" lang="en">
                    {visibleProfile?.email || '—'}
                  </dd>
                </div>
                <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-2">
                  <dt className="text-[#828282]">{t('school')}</dt>
                  <dd className="truncate text-black">{visibleProfile?.school || (loading ? '…' : '—')}</dd>
                </div>
                <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-x-2">
                  <dt className="text-[#828282]">{t('memberSince')}</dt>
                  <dd className="text-black/70">{memberSince}</dd>
                </div>
              </dl>
            )}
          </div>
          {nameError ? <p className="mt-2 w-full text-[11px] text-red-600">{nameError}</p> : null}
          {loadError ? <p className="mt-2 w-full text-[11px] text-red-600">{loadError}</p> : null}

          <div className="mt-4 w-full">
            <div className="relative">
              <button
                type="button"
                className="flex h-[27px] w-full items-center justify-between text-left text-[12px] font-normal text-black"
                aria-expanded={languageOpen}
                onClick={() => {
                  setLanguageOpen((current) => !current);
                  setThemeOpen(false);
                }}
              >
                <span>
                  {t('language')}: {localeLabel}
                </span>
                <ChevronIcon />
              </button>
              {languageOpen ? (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 space-y-1 rounded-[11px] border border-[#2a3e88]/20 bg-white p-2 shadow-lg">
                  <p className="text-[12px] text-[#828282]">{t('languageHint')}</p>
                  {APP_LOCALES.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={cn(
                        'block w-full rounded-md px-2 py-1 text-left text-[12px] text-black hover:bg-[#edf0fc]',
                        locale === option && 'bg-[#edf0fc] font-medium'
                      )}
                      onClick={() => {
                        setLocale(option);
                        setLanguageOpen(false);
                      }}
                    >
                      {LOCALE_LABELS[option]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative mt-3">
              <button
                type="button"
                className="flex h-[27px] w-full items-center justify-between text-left text-[12px] font-normal text-black"
                aria-expanded={themeOpen}
                onClick={() => {
                  setThemeOpen((current) => !current);
                  setLanguageOpen(false);
                }}
              >
                <span>
                  {t('themeMode')}: {themeLabel}
                </span>
                <ChevronIcon />
              </button>
              {themeOpen ? (
                <p className="absolute left-0 right-0 top-full z-20 mt-1 rounded-[11px] border border-[#2a3e88]/20 bg-white p-2 text-[12px] text-[#828282] shadow-lg">
                  {t('themeHint')}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 w-full rounded-[11px] border border-[#2a3e88] bg-white px-[15px] py-3">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[15px] font-normal text-black">{t('updatePassword')}</p>
              <PencilIcon />
            </div>
            <UpdatePasswordForm variant="panel" />
          </div>

          <div className="mt-auto flex w-full justify-center pt-6">
            <button
              type="button"
              onClick={onLogout}
              className="h-7 w-[107px] rounded-[40px] bg-[#1f2f66] text-[14px] font-normal leading-none text-white"
            >
              {t('logout')}
            </button>
          </div>
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
