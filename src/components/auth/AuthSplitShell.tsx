'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LoginLeavesAnimation } from '@/components/auth/LoginLeavesAnimation';
import { LocaleToggle } from '@/components/i18n/LocaleToggle';

export const authFieldClassName =
  'h-auto min-h-[44px] w-full rounded-lg border-transparent bg-[#f1f5f9] py-2.5 pl-[38px] pr-4 text-sm text-[#131b2e] placeholder:text-[#c3c6d7] max-md:landscape:min-h-[40px] max-md:landscape:py-2 md:text-sm';

export const authPasswordFieldClassName =
  'h-auto min-h-[44px] w-full rounded-lg border-transparent bg-[#f1f5f9] py-2.5 pl-[38px] pr-11 text-sm text-[#131b2e] placeholder:text-[#c3c6d7] max-md:landscape:min-h-[40px] max-md:landscape:py-2 md:text-sm';

export const authLabelClassName = 'text-[13px] font-medium tracking-[0.14px] text-[#434655]';

export const authPrimaryButtonClassName =
  'h-auto w-full rounded-lg bg-[#004ac6] py-2.5 text-sm font-medium tracking-[0.14px] text-white shadow-[0px_4px_10px_rgba(0,0,0,0.05)] hover:bg-[#003ea8] max-md:landscape:py-2';

export const authOutlineButtonClassName = cn(
  'h-auto w-full rounded-lg border-[#c3c6d7] bg-white py-2.5 text-sm font-medium tracking-[0.14px] text-[#131b2e]',
  'shadow-[0px_4px_10px_rgba(0,0,0,0.05)] hover:bg-slate-50 hover:text-[#131b2e] max-md:landscape:py-2'
);

type AuthSplitShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

type MobileAuthMode = 'desktop' | 'portrait' | 'landscape';

function useMobileAuthMode(): MobileAuthMode {
  const [mode, setMode] = useState<MobileAuthMode>('desktop');

  useEffect(() => {
    const portraitQuery = window.matchMedia('(max-width: 767px) and (orientation: portrait)');
    const landscapeQuery = window.matchMedia('(max-width: 767px) and (orientation: landscape)');

    const update = () => {
      if (portraitQuery.matches) {
        setMode('portrait');
        return;
      }
      if (landscapeQuery.matches) {
        setMode('landscape');
        return;
      }
      setMode('desktop');
    };

    update();
    portraitQuery.addEventListener('change', update);
    landscapeQuery.addEventListener('change', update);
    return () => {
      portraitQuery.removeEventListener('change', update);
      landscapeQuery.removeEventListener('change', update);
    };
  }, []);

  return mode;
}

export function AuthSplitShell({ title, subtitle, children }: AuthSplitShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const mobileAuthMode = useMobileAuthMode();
  const compactMobile = mobileAuthMode !== 'desktop';

  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;

    if (compactMobile) {
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
    }

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
    };
  }, [compactMobile]);

  useLayoutEffect(() => {
    if (!compactMobile) {
      setScale(1);
      return;
    }

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
  }, [compactMobile, title, subtitle]);

  return (
    <div className="relative flex h-full overflow-hidden bg-white max-md:landscape:flex-row">
      <div className="relative hidden h-full min-w-0 flex-1 overflow-hidden bg-[#dae2fd] md:block max-md:landscape:block">
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

      <div
        ref={panelRef}
        className="relative z-20 flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden bg-white md:w-1/2 max-md:landscape:w-1/2 max-md:landscape:max-w-[50vw]"
      >
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute z-[1] opacity-[0.08] md:opacity-10',
            'left-1/2 top-[-72px] size-[min(420px,80vw)] -translate-x-1/2',
            'max-md:landscape:left-auto max-md:landscape:right-[-48px] max-md:landscape:top-[-40px] max-md:landscape:size-[min(280px,55vh)] max-md:landscape:translate-x-0',
            'md:top-[-99px] md:size-[min(511px,90vw)]'
          )}
        >
          <img
            src="/images/auth/login-logo-mark.png"
            alt=""
            width={511}
            height={511}
            className="size-full object-contain"
          />
        </div>

        <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 pt-4 max-md:landscape:px-4 max-md:landscape:pt-2.5 md:px-12 md:pt-5">
          <LocaleToggle className="max-md:landscape:h-8" />
          <Link
            href="/"
            aria-label="Close"
            className="inline-flex size-[33px] shrink-0 items-center justify-center overflow-clip max-md:landscape:size-7"
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

        <div
          className={cn(
            'relative z-10 min-h-0 flex-1 overscroll-contain [-webkit-overflow-scrolling:touch]',
            scale < 1 ? 'overflow-hidden' : 'overflow-y-auto'
          )}
        >
          <div
            className={cn(
              'mx-auto flex min-h-full w-full max-w-[448px] flex-col justify-center px-5 pb-8 pt-[132px]',
              'max-md:landscape:max-w-none max-md:landscape:px-6 max-md:landscape:pb-4 max-md:landscape:pt-12',
              'md:px-16 md:pb-10 md:pt-[152px]'
            )}
          >
            <div
              ref={frameRef}
              className="relative z-10 w-full origin-top"
              style={scale < 1 ? { transform: `scale(${scale})` } : undefined}
            >
              <div className="mb-3 space-y-0.5 max-md:landscape:mb-2 md:mb-4">
                <h1 className="text-[24px] font-semibold leading-7 tracking-[-0.32px] text-[#131b2e] max-md:landscape:text-[22px] max-md:landscape:leading-7 md:text-[32px] md:leading-10">
                  {title}
                </h1>
                <p className="text-sm leading-5 text-[#505f76] max-md:landscape:text-[13px] max-md:landscape:leading-5 md:text-base md:leading-6">
                  {subtitle}
                </p>
              </div>
              {children}
              <p className="mt-3 text-center text-xs leading-4 text-[#505f76] max-md:landscape:hidden md:mt-4 md:text-sm md:leading-5">
                © 2024 ustudy.dev. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>

      <LoginLeavesAnimation className="max-md:landscape:hidden" />
    </div>
  );
}
