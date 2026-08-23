import type { ReactNode } from 'react';

type AuthIconFieldProps = {
  children: ReactNode;
  iconSrc: string;
  iconWidth: number;
  iconHeight: number;
  endAdornment?: ReactNode;
};

export function AuthIconField({
  children,
  iconSrc,
  iconWidth,
  iconHeight,
  endAdornment,
}: AuthIconFieldProps) {
  return (
    <div className="relative">
      <span
        className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 overflow-clip"
        style={{ width: iconWidth, height: iconHeight }}
      >
        <img src={iconSrc} alt="" width={iconWidth} height={iconHeight} className="h-full w-full" />
      </span>
      {children}
      {endAdornment}
    </div>
  );
}
