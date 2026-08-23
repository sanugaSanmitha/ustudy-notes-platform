'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LoginLeavesAnimation } from '@/components/auth/LoginLeavesAnimation';
import { LocaleToggle } from '@/components/i18n/LocaleToggle';

export const authFieldClassName =
  'h-auto min-h-[44px] w-full rounded-lg border-transparent bg-[#f1f5f9] py-2.5 pl-[38px] pr-4 text-sm text-[#131b2e] placeholder:text-[#c3c6d7] md:text-sm';

export const authPasswordFieldClassName =
  'h-auto min-h-[44px] w-full rounded-lg border-transparent bg-[#f1f5f9] py-2.5 pl-[38px] pr-11 text-sm text-[#131b2e] placeholder:text-[#c3c6d7] md:text-sm';

export const authLabelClassName = 'text-[13px] font-medium tracking-[0.14px] text-[#434655]';

export const authPrimaryButtonClassName =
  'h-auto w-full rounded-lg bg-[#004ac6] py-2.5 text-sm font-medium tracking-[0.14px] text-white shadow-[0px_4px_10px_rgba(0,0,0,0.05)] hover:bg-[#003ea8]';

export const authOutlineButtonClassName = cn(
  'h-auto w-full rounded-lg border-[#c3c6d7] bg-white py-2.5 text-sm font-medium tracking-[0.14px] text-[#131b2e]',
  'shadow-[0px_4px_10px_rgba(0,0,0,0.05)] hover:bg-slate-50 hover:text-[#131b2e]'
);

type AuthSplitShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthSplitShell({ title, subtitle, children }: AuthSplitShellProps) {
  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <div className="relative flex h-full overflow-hidden bg-white">
      <div className="relative hidden h-full flex-1 overflow-hidden bg-[#dae2fd] md:block">
        <img
          src="/images/auth/login-hero.png"
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 mix-blend-screen opacity-80">
          <img
            src="/images/auth/login-hero-overlay.png"
            alt=""
            className="size-full object-cover"
          />
        </div>
      </div>

      <div className="relative z-20 flex h-full w-full min-h-0 flex-col overflow-hidden bg-white md:w-1/2">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-99px] z-0 size-[min(511px,90vw)] -translate-x-1/2"
        >
          <img
            src="/images/auth/login-logo-mark.png"
            alt=""
            width={511}
            height={511}
            className="size-full object-contain opacity-10"
          />
        </div>

        <LocaleToggle className="absolute left-6 top-6 z-30 lg:left-10 lg:top-8" />
        <Link
          href="/"
          aria-label="Close"
          className="absolute right-6 top-6 z-30 size-[33px] overflow-clip lg:right-10 lg:top-8"
        >
          <img
            src="/icons/auth-close.png"
            alt=""
            width={33}
            height={33}
            className="size-full object-contain"
          />
        </Link>

        <div className="relative z-10 flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain px-6 py-8 lg:justify-center lg:px-12 lg:py-10">
          <div className="mx-auto w-full max-w-[420px]">
            <div className="mb-4 space-y-0.5">
              <h1 className="text-[26px] font-semibold leading-8 tracking-[-0.32px] text-[#131b2e]">
                {title}
              </h1>
              <p className="text-sm leading-5 text-[#505f76]">{subtitle}</p>
            </div>
            {children}
            <p className="mt-4 text-center text-xs leading-4 text-[#505f76]">
              © 2024 ustudy.dev. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      <LoginLeavesAnimation />
    </div>
  );
}
