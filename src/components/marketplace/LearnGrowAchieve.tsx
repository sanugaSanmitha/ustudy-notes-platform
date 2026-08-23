'use client';

import { useLocale } from '@/components/i18n/LocaleProvider';

export function LearnGrowAchieve() {
  const { t } = useLocale();

  return (
    <section className="relative mb-12 overflow-hidden py-4 lg:py-8">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,448px)] lg:gap-6">
        <div className="relative z-10 max-w-[666px]">
          <h2 className="text-[24px] font-bold leading-normal text-black">
            {t('learnGrowAchieveTitleLearn')}{' '}
            <span className="text-[#386abf]">{t('learnGrowAchieveTitleGrow')}</span>.{' '}
            {t('learnGrowAchieveTitleAchieve')}
          </h2>
          <p className="mt-4 text-[18px] font-normal leading-normal text-black">{t('learnGrowAchieveBody')}</p>
        </div>

        <div className="relative mx-auto h-[320px] w-full max-w-[448px] lg:h-[360px]">
          <div
            className="absolute inset-0 rounded-full opacity-20 mix-blend-multiply blur-[32px]"
            style={{
              backgroundImage: 'linear-gradient(45deg, rgb(219, 225, 255) 0%, rgb(0, 83, 219) 100%)',
            }}
          />

          <div className="absolute bottom-[8%] left-[2%] w-[72%] -rotate-6 opacity-80">
            <div className="flex flex-col gap-3 rounded-xl border border-[rgba(195,198,215,0.2)] bg-white p-4 shadow-[0px_4px_10px_rgba(0,0,0,0.05)] backdrop-blur-[2px]">
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded bg-[#2563eb] text-[16px] font-semibold text-[#eeefff]">
                  M
                </div>
                <div>
                  <p className="text-[16px] font-semibold leading-5 text-[#191b23]">MATH1014</p>
                  <p className="text-[10px] leading-[15px] text-[#737686]">Calculus II</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-2 w-full rounded-full bg-[#ededf9]" />
                <div className="h-2 w-3/4 rounded-full bg-[#ededf9]" />
              </div>
            </div>
          </div>

          <div className="absolute left-[8%] right-[8%] top-[6%] rotate-3">
            <div className="flex flex-col gap-4 rounded-xl border border-[rgba(195,198,215,0.2)] bg-white p-6 shadow-[0px_8px_15px_rgba(0,0,0,0.08)] backdrop-blur-[10px]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-[18px] font-bold leading-[27px] text-[#191b23]">
                    COMP2011 Complete Notes
                  </h3>
                  <p className="mt-1 text-[16px] leading-6 text-[#737686]">Fall 2026-2027</p>
                </div>
                <span className="rounded-md bg-[#6ffbbe] px-2 py-1 text-[16px] font-semibold leading-6 text-[#002113]">
                  A-
                </span>
              </div>

              <div className="flex h-24 items-center justify-center rounded-lg border border-[rgba(195,198,215,0.3)] bg-[#f3f3fe]">
                <span className="relative size-[30px] overflow-clip">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/icons/note-preview.svg"
                    alt=""
                    width={24}
                    height={30}
                    className="size-full"
                  />
                </span>
              </div>

              <div className="flex gap-2">
                <span className="rounded bg-[#eff6ff] px-2 py-1 text-[10px] font-semibold uppercase leading-[15px] text-[#004ac6]">
                  LAB
                </span>
                <span className="rounded bg-[#eff6ff] px-2 py-1 text-[10px] font-semibold uppercase leading-[15px] text-[#004ac6]">
                  EXAM
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-[rgba(195,198,215,0.2)] pt-4">
                <p className="font-display text-[16px] leading-6 text-[#191b23]">HK$49</p>
                <span className="inline-flex items-center gap-1 text-[16px] text-[#004ac6]">
                  {t('learnGrowAchieveView')}
                  <span className="relative size-[11px] overflow-clip">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/icons/view-arrow.svg"
                      alt=""
                      width={11}
                      height={11}
                      className="size-full"
                    />
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
