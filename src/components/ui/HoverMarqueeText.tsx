import { cn } from '@/lib/utils';

export function HoverMarqueeText({ text, className }: { text: string; className?: string }) {
  return (
    <div title={text} className={cn('group/marquee min-w-0 overflow-hidden [container-type:inline-size]', className)}>
      <span className="inline-block max-w-full truncate align-bottom motion-safe:group-hover/marquee:max-w-none motion-safe:group-hover/marquee:overflow-visible motion-safe:group-hover/marquee:text-clip motion-safe:group-hover/marquee:animate-hover-marquee">
        {text}
      </span>
    </div>
  );
}
