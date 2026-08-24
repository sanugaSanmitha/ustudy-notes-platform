'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LoginLeavesAnimation } from '@/components/auth/LoginLeavesAnimation';
import { LocaleToggle } from '@/components/i18n/LocaleToggle';

export const authFieldClassName =
  'h-auto min-h-[50px] w-full rounded-lg border-transparent bg-[#f1f5f9] py-[15px] pl-[41px] pr-[17px] text-base text-[#131b2e] placeholder:text-[#c3c6d7]';

export const authPasswordFieldClassName =
  'h-auto min-h-[50px] w-full rounded-lg border-transparent bg-[#f1f5f9] py-[15px] pl-[41px] pr-11 text-base text-[#131b2e] placeholder:text-[#c3c6d7]';

export const authLabelClassName = 'text-sm font-medium tracking-[0.14px] text-[#434655]';

export const authPrimaryButtonClassName =
  'h-auto w-full rounded-lg bg-[#004ac6] py-3 text-sm font-medium tracking-[0.14px] text-white shadow-[0px_4px_10px_rgba(0,0,0,0.05)] hover:bg-[#003ea8]';

export const authOutlineButtonClassName = cn(
  'h-auto w-full rounded-lg border-[#c3c6d7] bg-white py-[13px] text-sm font-medium tracking-[0.14px] text-[#131b2e]',
  'shadow-[0px_4px_10px_rgba(0,0,0,0.05)] hover:bg-slate-50 hover:text-[#131b2e]'
);

type AuthSplitShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthSplitShell({ title, subtitle, children }: AuthSplitShellProps) {
  return (
    <div className="relative flex h-full overflow-hidden bg-white">
      <div className="relative hidden h-full flex-1 overflow-hidden bg-[#dae2fd] md:block max-md:landscape:block">
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

      <div className="relative z-20 flex h-full w-full min-h-0 flex-col overflow-hidden bg-white md:w-1/2 max-md:landscape:w-1/2">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-7 top-[-32px] z-[1] size-[min(495px,118vw)] opacity-10 max-md:landscape:left-1/2 max-md:landscape:top-[-56px] max-md:landscape:size-[min(420px,80vw)] max-md:landscape:-translate-x-1/2 max-md:landscape:opacity-[0.08] md:left-1/2 md:top-[-99px] md:size-[min(511px,90vw)] md:-translate-x-1/2"
        >
          <img
            src="/images/auth/login-logo-mark.png"
            alt=""
            width={511}
            height={511}
            className="size-full object-contain"
          />
        </div>

        <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 pt-5 max-md:landscape:px-6 max-md:landscape:pt-3 md:px-12 md:pt-5">
          <LocaleToggle />
          <Link
            href="/"
            aria-label="Close"
            className="inline-flex size-[33px] shrink-0 items-center justify-center overflow-clip"
          >
            <img
              src="/icons/auth-close.png"
              alt=""
              width={33}
              height={33}
              className="size-full object-contain"
            />
          </Link>
        </div>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
          <div className="mx-auto flex min-h-full w-full max-w-[344px] flex-col px-6 pb-10 pt-[112px] max-md:landscape:max-w-[448px] max-md:landscape:px-8 max-md:landscape:pb-8 max-md:landscape:pt-14 md:max-w-[448px] md:px-16 md:pb-10 md:pt-[152px]">
            <div className="w-full">
              <div className="mb-6 space-y-2 max-md:landscape:mb-4 max-md:landscape:space-y-0.5 md:mb-4">
                <h1 className="text-[32px] font-semibold leading-10 tracking-[-0.32px] text-[#131b2e] max-md:landscape:text-[26px] max-md:landscape:leading-8">
                  {title}
                </h1>
                <p className="text-base leading-6 text-[#505f76] max-md:landscape:text-sm max-md:landscape:leading-5">
                  {subtitle}
                </p>
              </div>
              {children}
              <p className="mt-6 hidden text-center text-sm leading-5 text-[#505f76] md:block">
                © 2024 ustudy.dev. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      <LoginLeavesAnimation className="[@media(orientation:portrait)_and_(max-width:767px)]:hidden" />
    </div>
  );
}
