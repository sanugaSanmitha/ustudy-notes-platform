import Link from 'next/link';
import { cn } from '@/lib/utils';

type CourseLetterChip = {
  letter: string;
  count: number;
  href: string;
};

type CourseLetterChipsProps = {
  letters: CourseLetterChip[];
  activeLetter?: string;
};

export function CourseLetterChips({ letters, activeLetter }: CourseLetterChipsProps) {
  if (letters.length === 0) {
    return null;
  }

  return (
    <div className="w-full overflow-x-auto px-2 pb-4 pt-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex w-max min-w-full items-center justify-center gap-3">
        {letters.map(({ letter, count, href }) => {
          const isActive = activeLetter === letter;
          return (
            <Link
              key={letter}
              href={href}
              prefetch={false}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors',
                isActive
                  ? 'border-[#c3c6d7] bg-[#e4eeff] text-[#131b2e]'
                  : 'border-[#c3c6d7] bg-white text-[#131b2e] hover:border-[#004ac6]'
              )}
            >
              <span className="text-[12px] font-semibold tracking-[0.12px]">{letter}</span>
              <span className="rounded-full bg-[#dae2fd] px-1.5 py-px text-[9px] font-bold leading-[13px] text-[#434655]">
                {count}
              </span>
              <span className="relative size-2 overflow-clip">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/letter-chip-arrow.svg"
                  alt=""
                  width={8}
                  height={8}
                  className="size-full"
                />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
