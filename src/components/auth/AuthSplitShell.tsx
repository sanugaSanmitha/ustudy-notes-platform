'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
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
  const panelRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

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

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const frame = frameRef.current;
    if (!panel || !frame) return;

    const update = () => {
      const available = panel.clientHeight;
      const needed = frame.scrollHeight;
      if (!available || !needed) return;
      setScale(Math.min(1, available / needed));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    observer.observe(frame);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
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

      <div ref={panelRef} className="relative z-20 h-full w-full overflow-hidden bg-white md:w-1/2">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[-99px] z-[1] size-[511px] -translate-x-1/2"
        >
          <img
            src="/images/auth/login-logo-mark.png"
            alt=""
            width={511}
            height={511}
            className="size-full object-cover opacity-10"
          />
        </div>

        <div
          ref={frameRef}
          className="relative z-10 w-full origin-top"
          style={{ transform: `scale(${scale})` }}
        >
          <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 pt-5 md:px-12">
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

          <div className="relative z-10 px-6 pb-8 pt-[152px] md:px-16">
            <div className="relative z-10 mx-auto flex w-full max-w-[448px] flex-col">
              <div className="mb-4 space-y-0.5">
                <h1 className="text-[26px] font-semibold leading-8 tracking-[-0.32px] text-[#131b2e] md:text-[32px] md:leading-10">
                  {title}
                </h1>
                <p className="text-sm leading-5 text-[#505f76] md:text-base md:leading-6">{subtitle}</p>
              </div>
              {children}
              <p className="mt-4 text-center text-xs leading-4 text-[#505f76] md:text-sm md:leading-5">
                © 2024 ustudy.dev. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
